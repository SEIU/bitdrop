# User Interface

The interface of "new BitDrop" resembles the prevous implementation. In simple wireframe:

---

| SEIU BitDrop    |                                              |
| --------------: | :------------------------------------------- | 
| Password:       | prefilled-passphrase-random-words            |
| Choose File:    | \<file-selection-widget\>                    |
| Email Files To: | \<enter-email-address\> (URL not shown)      |
| Deletion Link:  | b.seiu.org/delete?id=kETG3DX0Hs              |
| **\[Upload Now\]**                                            ||

| Notices
|:---------------------------------------------------------------:
| Files will be deleted after 24 hours or at first download. 
| Send PW via a separate channel from the email address used\!  

---

When recipient clicks the URL,  e.g.
[https://b.seiu.org/verify?id=kETG3DX0Hs](https://b.seiu.org/download?id=kETG3DX0Hs),
that was sent to them by email, they will see a screen similar to the old
interface:

---

| SEIU BitDrop    |                                             |
| --------------: | :------------------------------------------ |
| Password:       | \<enter-password\>                          |
| **\[Download Now\]**                                         ||

---

# Frontend Responsibilities

* In upload screen

1. Generate a random passphrase consisting of four randomly selected words from
   a 10,000 word dictionary, separated by dashes.  This phrase is not
   user-editable.
2. Upload a file into local memory within the browser (i.e. contents in a
   variable or a buffer).
3. Require entry of something that looks more-or-less like an email address.
4. Generate a random token for the upload, download, and delete routes, and to
   display within the deletion link.
5. After a file is selected, encrypt it within the browser using standard
   SubtleCrypto developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt.
   Use AES-CBC mode.
6. Post the encrypted content to the backend.

* In download screen  
  * Extract the id from the verify route.  
  * Collect a password from a form field.  
  * Send the id to the download route.  
  * Send the decrypted bytes from the backend to the user.

In pseudo-code, the download screen will perform these actions:

```javascript
const response = await fetch("https://api.b.seiu.org/download/38924387091");
if (!response.ok) { ... handle missing file ... }

const result = await response.json();
const content = decrypt(atob(result.base64_content), password);
const encoder = new TextEncoder();
const data = encoder.encode(content);
const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);

// Convert the hash to a hex string
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
if (hashHex !== result.raw_hash) { ... handle bad decryption ... }

// ... Send the data to user
await fetch(
    "https://api.b.seiu.org/download/38924387091/da39a3ee5e6b4b...",
    { method: "DELETE" }
);
```

# Backend Routes

## POST api/upload/\<id\>/\<raw\_hash\>/\<filename\>

The post body is raw encrypted bytes. Content-type is application/octet-stream.

The backend server is responsible for storing the posted bytes associated with
their id token. These bytes will be deleted after either 24 hours have passed
or when they have been successfully downloaded once.

## GET api/download/\<id\>

If the file exists, return a 200 status. The body will resemble:

```json
{
    "filename": "myfile.csv",
    "raw_hash": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    "base64_content": "aGVsbG8gd29ybGQK..."
}
```

The frontend will decide whether the password is acceptable.  This password is
explicitly never sent to the backend.

If the file does not exist, a 404 is returned.

## DELETE api/download/\<id\>/\<raw\_hash\>

As a policy on the frontend, a file will be deleted after successful decryption
and download.  The frontend *should* call the deletion route under that
circumstance.

If a file with the specified id and raw\_hash exists, a 200 is returned (and
the file is deleted). If it does not exist, a 404 is returned.
