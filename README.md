node-pgp-mail is a library to send PGP-encrypted e-mails. In the future, signing e-mails will also
be supported.

Use the following code to initialise node-pgp-mail:

```javascript
var pgpMail = require("node-pgp-mail");

var keyring; // node-pgp keyring object
var mailer = new pgpMail(keyring, "SENDMAIL", { "path": "/usr/sbin/sendmail" });
```

The second and third parameter define the mail transport method, see
[the Nodemailer docu](https://github.com/andris9/Nodemailer#setting-up-a-transport-method)
for the syntax.

getMailRecipient()
------------------

Finds out one e-mail address to send an e-mail to the owner of the key. Prefers the one
of the primary identity, but if that does not contain one, uses the one of an arbitrary
other identity.

```javascript
var keyId = "012345678ABCDEFAB"; // 16-digit uppercase hex long key ID
mailer.getMailRecipient(keyId, function(err, recipient) {
	if(err)
		; // An error occurred

	// recipient is a string or null if none was found
});
```

sendEncryptedMail()
-------------------

```javascript
var to = "test@example.org";
var subject = "Test e-mail";
var body = "Test e-mail";
var toKeyId = "012345678ABCDEFAB"; // 16-digit uppercase hex long key ID to encrypt to
var headers = { "Reply-To": "test@example.com" }; // Optional additional e-mail headers
mailer.sendEncryptedMail(to, subject, body, toKeyId, function(err) {
	if(err)
		; // An error occurred
}, headers);
```


sendMail()
----------

Sends an **unencrypted** mail.

```javascript
var to = "test@example.org";
var subject = "Test e-mail";
var body = "Test e-mail";
mailer.sendMail(to, subject, body, function(err) {
	if(err)
		; // An error occurred
});
```

In order to specify additional headers, use a [Mime](#mime) object instead of a string as text.

Mime
----

For the e-mail body, instead of a string, you can also specify a Mime object:

```javascript
var contentType = "text/plain";
var content = "Test e-mail";
var headers = { "Reply-To": "test@example.com" };
var transferEncoding = "quoted-printable";
var body = new pgpMail.Mime(contentType, content, headers, transferEncoding);
```

This also supports multipart messages by specifying an array as content:

```javascript
var body = new pgpMail.Mime("multipart/mixed", [
    new pgpMail.Mime("text/plain", "Test part 1"),
    new pgpMail.Mime("text/plain", "Test part 2")
]);
```