# Customization

This software was originally implemented by and for Service Employees
International Union.  You are very welcome to utilize it, but you must change
elements identifying the deployment as belonging to SEIU.  Changing branding
is discussed in [BRANDING.md](docs/BRANDING.md).

Although not "branding" per se, that document also contains discussion of
changes that will be needed in the `deploy.sh` script.

# User Interface

The interface of "new BitDrop" resembles the prevous implementation. In simple
wireframe:

---

| SEIU BitDrop    |                                              |
| --------------: | :------------------------------------------- | 
| Choose File:    | \<file-selection-widget\>                    |
| Email Files To: | \<enter-email-address\> (URL not shown)      |
| **\[Submit\]**                                                ||

---

After submitting, additional screen elements will appear, resembling:

| SEIU BitDrop                       |                           |
|:---------------------------------: | :------------------------ |
| Files will be deleted              | Send PW via a separate    |
| after 24 hours or at 1st download. | channel from email        |
| Password:                          | pw-random-words           |
| **\[Send Another File\]**                                     ||

When recipient clicks a URL like https://b.seiu.org/verify?id=913AEAB4-00E0,
that was sent to them by email, they will see a screen similar:

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
   Use AES-GCM mode.
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

