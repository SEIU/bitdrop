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

Nothing stored on disk will be unencyrpted.  The script `remove-old-uploads`
will run periodically as a cronjob to purge any files with timestamps older
than 24 hours.

## Uploads in progress

When a call to `upload-chunk` is made, a directory is created or used,
utilizing the information available in that route's body. For example, at a
given moment in time, we may have files resembling:

<pre>
/tmp
├── 6972b2be-cf9b-uuid
│   └── 2025-12-02T01:02:03
│       └── of-5
│           ├── 1
│           ├── 3
│           └── 4
└── d44b5d5c-cf9b-uuid
    └── 2025-12-02T02:03:04
        └── of-2
            └── 1
</pre>

This indicates that two uploads of particular `fileID` values are "in flight".
In the specific example shown, chunk 2 of 5 for 6972b2be-cf9b-uuid has not yet
arrived, for whatever reason.

# Supported Routes

## GET /

A route purely for testing that a server is running. Returns a simple welcome
message.

## POST authenticate

The frontend will send a Google recaptcha token for the backend to verify.

```json
{
  "recaptchaToken": "token",
}
```

The response is a JSON `true` or `false`

## POST upload-chunk

To accomodate sending large files from computers with limited memory and/or
over slower connections, encryption is performed on each chunk of data rather
than on entire files.

An uploaded chunk is defined by a POST body similar to:

```json
{
  "fileID": "168100d2-fdd3-uuid",
  "chunkIndex": 1,
  "totalChunks": 2,
  "encryptedData": "base64-data-here"
}
```

By design, information including the SHA-256 hash of the full file, and even its
filename, are not sent until all chunks have been sent.

The backend server is responsible for storing the posted bytes associated with
their id token. These bytes will be deleted after either 24 hours have passed
or when they have been successfully downloaded once.

The field `fileID` is a UUID that globally uniquely identifies the object
being uploaded.

In the happy case, this route simply returns a 200 status code.

### Error conditions

A few things can go wrong with uploaded chunks.  Every `fileID` is validated
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

* If the same `chunkIndex` is received (relative to same `fileID`) more than
  once, the sequence is invalid, and this and all subsequent uploads with this
  `fileID` return a 400 status code with a body similar to:

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
  "fileID": "168100d2-fdd3-uuid",
  "iv": "sha256-hash",
  "email": "foo@example.com",
  "filename": "cute-kitten.jpg"
}
```

If all expected chunks exist for the specified `fileID`, the route returns a
200 after copying the files to their downloadable locations and directory
hierarchy.

If this condition is not fulfilled, a 4xx status code is returned.

### Error conditions

* If we have no chunks saved matching the provided `fileID`, return a 404
  status code.

* If we have an incomplete collection of chunks pertaining to the `fileID' ,
  return a 409 with a body similar to:

```json
{
  "message": "Not all encrypted chunks are available.",
  "totalChunks": 10,
  "available": [1, 2, 3, 5, 6, 7, 9, 10]
}
```

## GET download/\<fileID\>

If the file exists, return a 200 status. The body will resemble:

```json
{
    "filename": "secret-membership-data.csv",
    "iv": "sha256-hash",
    "totalChunks": 3,
    "chunks": [
        "cGV0LXBhaXJzLWV2aWRlbmNlLXBlbgo=",
        "Y3V0ZSBraXR0ZW4K",
        "Y2hhbWJlcnMtY2Fycmllc"
    ]
}
```

The frontend will decide whether the password is acceptable.  This password is
explicitly never sent to the backend.  We expect that the `iv` will be an
SHA-256 hash of the original uploaded file, but the backend does not enforce
any contraint on what is used for an IV (initialization vector).

If the file does not exist, a 404 is returned.

## DELETE download/\<fileID\>/\<iv\>

As a policy on the frontend, a file will be deleted after successful
decryption and download.  The frontend *should* call the deletion route under
that circumstance.

If a file with the specified `fileID` and `iv` exists, a 200 is returned (and
the file is deleted). If it does not exist, a 404 is returned.

