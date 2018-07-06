// @flow
import React, { Component } from "react";
import { HashRouter, Link } from "react-router-dom";
import type { History } from "history";
import { Switch, Route, withRouter, type Location } from "react-router";
import { saveAs } from "file-saver";
import logo from "./logo.svg";
import "./App.css";
import DeafSandstorm, {
  type UploadResult,
  type PayloadData,
} from "./DeafSandstorm";

const Chrome = ({ children }) => (
  <div className="App">
    <header className="App-header">
      <Link to="/">
        <img src={logo} className="App-logo" alt="logo" />
      </Link>
      <h1 className="App-title">IPFS Secure File Transfer</h1>
    </header>
    {children}
  </div>
);

type UploadFormProps = {
  onUpload: UploadResult => void,
};

type UploadFormState = {
  status: "ready" | "busy" | "failed" | "succeeded",
  message: ?string,
};

class UploadForm extends React.Component<UploadFormProps, UploadFormState> {
  filename: ?string;
  fileReader: ?FileReader;

  state = {
    status: "ready",
    message: null,
  };

  handleUpload = e => {
    const input = e.currentTarget;
    const file = input.files[0];
    if (file.size > DeafSandstorm.fileSizeLimit) {
      const limitMB = DeafSandstorm.fileSizeLimit / 1024 / 1024;
      return this.setState({
        status: "failed",
        message: DeafSandstorm.isLocalGateway
          ? `To upload files larger than ${limitMB} MB, access this page from your local IPFS gateway.`
          : `Files larger than ${limitMB} MB are not supported.`,
      });
    } else {
      this.filename = file.name;
      const reader = (this.fileReader = new FileReader());
      reader.addEventListener("loadend", this.handleLoadEnd);
      reader.readAsArrayBuffer(file);
      // This isn't accurate, but it gets the point across that the slowness is
      // on the local end.
      this.setState({ status: "busy", message: "Encrypting..." });
    }
  };

  handleLoadEnd = (e: ProgressEvent) => {
    const reader = ((this.fileReader: any): FileReader);
    if (reader.error) {
      this.setState({
        status: "failed",
        message: `${(reader.error: any).message} (Error ${reader.error.name})`,
      });
    } else {
      this.setState({ status: "busy", message: "Uploading..." });
      DeafSandstorm.upload({
        filename: (this.filename: any),
        data: (reader.result: any),
      }).then(this.handleUploadResult, this.handleUploadFailure);
    }
  };

  handleUploadResult = (r: UploadResult) => {
    this.props.onUpload(r);
  };

  handleUploadFailure = (e: Error) => {
    this.setState({ status: "failed", message: e.message });
  };

  componentWillUnmount() {
    if (this.fileReader) {
      this.fileReader.removeEventListener("loadend", this.handleLoadEnd);
      this.fileReader = null;
    }
  }

  render() {
    return (
      <form>
        <p>{this.state.message}</p>
        <input type="file" onChange={this.handleUpload} />
      </form>
    );
  }
}

const Upload = props => (
  <Chrome>
    <p className="App-intro">Drop a file here to securely upload it to IPFS.</p>
    <UploadForm {...props} />
  </Chrome>
);

type DownloadProps = {
  didUpload: boolean,
  filename: ?string,
  location: Location,
};

type DownloadState = {
  status: "busy" | "failed" | "ready",
  message: ?string,
  filename: ?string,
};

class Download extends React.Component<DownloadProps, DownloadState> {
  blob: ?Blob;

  constructor(props: DownloadProps) {
    super(props);

    if (props.didUpload) {
      this.state = {
        status: "ready",
        message: "File uploaded successfully.",
        filename: props.filename,
      };
    } else {
      const address = props.location.pathname.slice(1);
      const hash = DeafSandstorm.getHash(address);
      this.state = {
        status: "busy",
        message: "Downloading...",
        filename: `IPFS Hash ${hash}`,
      };
    }
  }

  componentDidMount() {
    if (!this.props.didUpload) {
      const address = this.props.location.pathname.slice(1);
      DeafSandstorm.download(address).then(
        this.handleDownloadFinished,
        this.handleDownloadFailed,
      );
    }
  }

  handleDownloadFinished = (payload: PayloadData) => {
    this.blob = new Blob([payload.data], { type: "application/octet-stream" });
    this.setState({
      status: "ready",
      message: "File is ready to download.",
      filename: payload.filename,
    });
  };

  handleDownloadFailed = (e: Error) => {
    this.setState({ status: "failed", message: e.message });
  };

  render() {
    const address = this.props.location.pathname.slice(1);
    const hash = DeafSandstorm.getHash(address);
    return (
      <Chrome>
        <p className="App-intro">{this.state.message}</p>
        <p className="App-intro">{this.state.filename}</p>
        {this.blob && (
          <p>
            <button onClick={() => saveAs(this.blob, this.state.filename)}>
              Save File
            </button>
          </p>
        )}
      </Chrome>
    );
  }
}

const About = () => <p className="App-intro">This is the about page.</p>;

type AppRouterState = {
  didUpload: boolean,
  filename: ?string,
};

type AppRouterProps = {
  history: History,
};

class AppRouterDumb extends React.Component<AppRouterProps, AppRouterState> {
  state = {
    didUpload: false,
    filename: null,
  };

  handleUpload = (r: UploadResult) => {
    this.setState({ didUpload: true, filename: r.filename });
    this.props.history.push(r.address);
  };

  render() {
    return (
      <Switch>
        <Route
          exact
          path="/"
          render={() => <Upload onUpload={this.handleUpload} />}
        />
        <Route exact path="/about" component={About} />
        <Route
          render={props => (
            <Download
              didUpload={this.state.didUpload}
              filename={this.state.filename}
              {...props}
            />
          )}
        />
      </Switch>
    );
  }
}

const AppRouter = withRouter(AppRouterDumb);

const App = () => (
  <HashRouter hashType="noslash">
    <AppRouter />
  </HashRouter>
);

export default App;
