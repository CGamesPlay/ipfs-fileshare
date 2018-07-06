# IPFS Uploader

An app to upload files to IPFS in a secure, encrypted manner. The files are
encrypted locally and the encrypted file is uploaded, with a key that is stored
on the client side. You can send the URL over a secure messaging platform to
allow another user to retrieve the file from IPFS and decrypt it.

## Public, writable IPFS gateways:

- localhost:8080
- hardbin.com
- ipfs.works

Pinning service:

- https://www.eternum.io/pin/$hash/

## Publishing

```
yarn build
ipfs add -r build
```
