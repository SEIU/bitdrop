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

When recipient clicks a URL like https://b.seiu.org/verify?id=913AEAB4-00E0,
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
const response = await fetch(
    "https://api.b.seiu.org/download/913AEAB4-00E0-40C6-86A4-A52EE87E6DD2");
if (!response.ok) { ... handle missing file ... }

const result = await response.json();
const content = decrypt(atob(result.base64_content), password);
const encoder = new TextEncoder();
const data = encoder.encode(content);
const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);

// Convert the hash to a hex string
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
if (hashHex !== result.raw_hash) { ... handle bad decryption ... }

// ... Send the data to user

// Delete the stored data after sending
await fetch(
    "https://api.b.seiu.org/download/" +
    "913AEAB4-00E0-40C6-86A4-A52EE87E6DD2/" +
    "77e4d140d5636d103d797254143c498fbd057af8",
    { method: "DELETE" }
);
```

# Backend Routes

See [API documentation](docs/API.md) for details on supported routes.

