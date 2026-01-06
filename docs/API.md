# Data Storage

## Ready to download

Downloadable files, after successful upload, will be stored on the local disk
in a structure similar to:

<pre>
$HOME/uploads/
├── 2025-12-01T20:08:08
│   └── 168100d2-fdd3-uuid
│       └── 38c24a46c4fdce477-sha256
│           └── membership.csv
│               ├── 1
│               ├── 2
│               ├── 3
│               └── 4
└── 2025-12-01T20:28:28
    └── 22216e2f-a1ae-uuid
        └── 8b7775c7ef80643ca7-sha256
            └── kittens.png
                ├── 1
                └── 2
</pre>

Everything stored on disk will be encyrpted.  The script `remove-old-uploads`
will run periodically as a cronjob to purge any files with timestamps older
than 24 hours.

## Uploads in progress

When a call to `upload-chunk` is made, a directory is created or used,
utilizing the information available in that route's body. For example, at a
given moment in time, we may have files resembling:

<pre>
/tmp
├── 6972b2be-cf9b-uuid
│   └── of-5
│       ├── 1
│       ├── 3
│       └── 4
└── d44b5d5c-f793-uuid
    └── of-2
        └── 1
</pre>

This indicates that two uploads of particular `fileId` values are "in flight".
In the specific example shown, chunk 2 of 5 for 6972b2be-cf9b-uuid has not yet
arrived, for whatever reason.

# Supported Routes

## GET /

A route purely for testing that a server is running. Returns a simple welcome
message.

## POST upload-chunk

To accomodate sending large files from computers with limited memory and/or
over slower connections, encryption is performed on each chunk of data rather
than on entire files.

An uploaded chunk is defined by a POST body similar to:

```json
{
  "fileId": "168100d2-fdd3-uuid",
  "chunkIndex": 1,
  "totalChunks": 2,
  "encryptedData": "base64-data-here"
}
```

By design, information including the SHA-256 hash of the full file, and even
its filename, are not sent until all chunks have been sent.

The backend server is responsible for storing the posted bytes associated with
their id token. These bytes will be deleted after either 24 hours have passed
or when they have been successfully downloaded once.

The field `fileId` is a UUID that globally uniquely identifies the object
being uploaded.

In the happy case, this route simply returns a 201 status code.

### Error conditions

A few things can go wrong with uploaded chunks.  Every `fileId` is validated
as being a UUID.  `chunkIndex` and `totalChunks` are validated as integers.
`encryptedData` is simply validated as a string, but we expect it to be Base64
encoded in normal operation.

* If `chunkIndex` or `totalChunks` are not natural numbers, a 400 status code
  is returned with the body: 

```json
{"message": "chunkIndex and totalchunks must be natural numbers"}
```

* If `chunkIndex` is greater than `totalChunks`, a 400 status code is returned
  with a body similar to:

```json
{"message": "chunkIndex was 12, but totalChunks is only 11"}
```

* If the same `chunkIndex` is received (relative to same `fileId`) more than
  once, the sequence is invalid, and this and all subsequent uploads with this
  `fileId` return a 400 status code with a body similar to:

```json
{"message": "Upload 168100d2-fdd3-uuid contains duplicate chunkIndex values"}
```

## POST complete-upload

This call will be used when the frontend anticipates that all chunks have been
sent.  Because of the uncertainty of TCP/IP routing, it is possible that this
will be called before all chunks have been received.

The body of this call will resemble:

```json
{
  "fileId": "168100d2-fdd3-uuid",
  "fileHash": "sha256-hash",
  "email": "foo@example.com",
  "filename": "cute-kitten.jpg"
}
```

If all expected chunks exist for the specified `fileId`, the route returns a
200 after copying the files to their downloadable locations and directory
hierarchy.

If this condition is not fulfilled, a 4xx status code is returned.

### Error conditions

* If we have no chunks saved matching the provided `fileId`, return a 404
  status code.

* If we have an incomplete collection of chunks pertaining to the `fileId`,
  return a 409 with a body similar to:

```json
{
  "message": "Not all encrypted chunks are available.",
  "totalChunks": 10,
  "available": [1, 2, 3, 5, 6, 7, 9, 10]
}
```

## GET download/\<fileId\>

If the file exists, return a 200 status. The body will resemble:

```json
{
    "filename": "secret-membership-data.csv",
    "fileHash": "sha256-hash",
    "totalChunks": 3,
    "chunks": [
        "cGV0LXBhaXJzLWV2aWRlbmNlLXBlbgo=",
        "Y3V0ZSBraXR0ZW4K",
        "Y2hhbWJlcnMtY2Fycmllc"
    ]
}
```

The frontend will decide whether the password is acceptable.  This password is
explicitly never sent to the backend in this route.  We expect that the
`fileHash` will be an SHA-256 hash of the original uploaded file, but the
backend does not enforce any contraint. Albeit, the SHA hash is used as an IV
(initialization vector).

If the file does not exist, a 404 is returned.

# GET count-chunks/\<fileId\>

If the `fileId` exists, return a 200 status code with a JSON number as a
response.  Specifically, this will always be a natural number.  By convention,
we expect chunks to be approximately 7 MB, since the frontend by default breaks
binary files into 5 MiB chunks, then Base64 encodes them.  However, the
backend imposes no such constraint, and a frontend may choose to send chunks
of any size, encoded as text in any manner.  The final chunk will, of course,
be of varying size.

A frontend _may decide_ to utilize this information about the chunk count to
modify the messaging presented to users, create a progress bar, or modify the
download strategy used.  For example, the frontend might choose to use a call
to `GET download/` for a small number of chunks, but use repeated calls to
`GET download-chunk/` for a large number of chunks.

If the `fileId` simply does not exist, we return a 404.  If the server is in a
bad state with a duplicate of the `fileId` stored on disk, we return a 409
(this should really never happen, and would reflect a programming error in the
system).

## GET download-chunk/\<fileId\>/<chunkNum\>

Download just one chunk of an uploaded file, identified by `fileId` (and by
`chunkNum`).  The usual constraints exist about valid chunk numbers. The 200
response to this route is deliberately similar to that of `GET download/`:


```json
{
    "filename": "secret-membership-data.csv",
    "fileHash": "sha256-hash",
    "totalChunks": 3,
    "chunk": "RWFzdGVyIEVnZwo="
}
```

Since one returned field is `totalChunks`, a caller _could_ simply ask for
chunk 1 (which will always exist for an existing file) to determine the number
of chunks. However, the call to `GET count-chunks/` should provide a faster
response.

It is the responsibility of the frontent to make this call for every chunk
number that exists for a file.  Note that chunk numbers are natural numbers.
An empty chunk numbered zero only exists if an error occurred during the
upload, and acts as a sentinel for this situation.

If the `fileId` simply does not exist, we return a 404.  If the server is in a
bad state with a duplicate of the `fileId` stored on disk, we return a 409
(this should really never happen, and would reflect a programming error in the
system).

## GET download/\<fileId\>/\<password\>

This route is not our recommended implementation.  However, an API exists to
perform decryption on the backend, and send a file as a response.  This can be
valuable for debugging purposes, and may be appropriate in some scenarios
better to distribute CPU and memory resources from browser to server.

While this route still never stores unencrypted content on disk, it does send
the password over the wire to the server, and send the unencrypted file in
response to the recipient.  If TLS is used, this should still be secure,  but
it does create an additional attack surface.

In general, the backend is agnostic about the encryption used by the frontend.
However, to perform decryption on the backend side, we assume that each chunk
is encrypted using AES in GCM mode, Base64 encoded, and that the key is
derived using PBKDF2, with a salt of 12 bytes (taken from the prefix of the
fileId), a count of 300,000 rounds, and a hash of SHA256.  If a frontend
chooses any different algorithms for key derivation, chunk encoding, or
encryption, this route will simply generate nonsensical data.

If all goes well, the file is returned as an octet-stream, with
`Content-disposition` of `attachment; filename=<filename>` and a status code
of 200.

In the unhappy cases, we return a 401 if the decrypted file is corrupted. This
could indicate either that the wrong password was provided or that the
frontend has used different algorithms.  If the `fileId` simply does not
exist, we return a 404.  If the server is in a bad state with a duplicate of
the `fileId` stored on disk, we return a 409 (this should really never happen,
and would reflect a programming error in the system).

## DELETE download/\<fileId\>/\<fileHash\>

As a policy on the frontend, a file will be deleted after successful
decryption and download.  The frontend *should* call the deletion route under
that circumstance.

If a file with the specified `fileId` and `fileHash` exists, a 200 is returned
(and the file is deleted). If it does not exist, a 404 is returned.

