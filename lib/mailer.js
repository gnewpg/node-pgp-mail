var pgp = require("node-pgp");
var async = require("async");
var Mime = require("./mime");
var nodemailer = require("nodemailer");
var mailcomposer = require("nodemailer/node_modules/mailcomposer");

function Mailer(keyring, transport, options) {
	this.__keyring = keyring;
	this.__transport = nodemailer.createTransport(transport, options);
}

Mailer.prototype = {
	getMailRecipient : function(keyId, callback) {
		this.__keyring.getPrimaryIdentity(keyId, function(err, identityInfo) {
			if(err)
				return callback(err);

			if(identityInfo.email && this.isEmailAddress(identityInfo.email))
				return callback(null, identityInfo.id);

			keyring.getSelfSignedIdentities(keyId, null, [ "id", "email" ]).forEachSeries(function(identityInfo, next) {
				if(identityInfo.email && this.isEmailAddress(identityInfo.email))
					return callback(null, identityInfo.id);
				next();
			}.bind(this), function(err) {
				callback(err, null);
			});
		}.bind(this), [ "id", "email" ]);
	},

	isEmailAddress : function(str) {
		// http://www.regular-expressions.info/email.html
		return str.match(/(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/);
	},

	sendMail : function(to, subject, mime, callback) {
		mime.headers["To"] = to;
		mime.headers["Subject"] = subject;
		mime.headers["Mime-Version"] = "1.0";

		var composer = new mailcomposer.MailComposer();
		composer._envelope.to = to; // TODO: Punycode?
		composer.streamMessage = function() {
			this.emit("data", new Buffer(mime.toString(), "utf8"));
			this.emit("end");
		};
		this.__transport.sendMailWithTransport(composer, callback);
	},

	sendEncryptedMail : function(to, subject, text, toKeyId, callback) {
		if(!(text instanceof Mime))
			text = new Mime("text/plain; charset=UTF-8", text, null, "quoted-printable");

		this._encryptMessage(toKeyId, new Mime("multipart/mixed", [ text ]).toString(), function(err, msg) {
			if(err)
				return callback(err);

			this.sendMail(to, subject, msg, callback);
		}.bind(this));
	},

	/*sendSignedMail : function(to, subject, text, callback) {
		async.waterfall([
			async.apply(_signMessage, text),
			async.apply(_sendMail)
		], callback);
	}

	sendSignedAndEncryptedMail: function(toKeyId, subject, text, callback) {
		async.auto({
			recipient: async.apply(getMailRecipient, toKeyId),
			sign: async.apply(_signMessage, text),
			encrypt: [ "sign", function(cb, res) { _encryptMessage(res.sign.toString(), toKeyId, cb); } ],
			send: [ "recipient", "encrypt", function(cb, res) { _sendMail(res.recipient, subject, res.encrypt, cb); } ]
		}, callback);
	}

	_signMessage : function(messageText, callback) {
		var signedPart = new Mime("text/plain; charset=utf-8", messageText, { }, "quoted-printable");

		pgp.signing.detachedSignText(signedPart.toString(), privateKey, function(err, signature) {
			if(err)
				return callback(err);

			pgp.formats.enarmor(signature, pgp.consts.ARMORED_MESSAGE.MESSAGE).readUntilEnd(function(err, armored) {
				if(err)
					return callback(err);

				var signedMessageMime = new Mime(
					"multipart/signed; micalg=pgp-sha256; protocol=\"application/pgp-signature\"",
					[
						signedPart,
						new Mime("application/pgp-signature", armored)
					]
				);

				callback(signedMessageMime);
			});
		});
	}*/

	_encryptMessage : function(toKeyId, messageText, callback) {
		pgp.encryption.encryptData(this.__keyring, toKeyId, messageText, function(err, encrypted) {
			if(err)
				return callback(err);

			pgp.formats.enarmor(encrypted, pgp.consts.ARMORED_MESSAGE.MESSAGE).readUntilEnd(function(err, armored) {
				if(err)
					return callback(err);

				var encryptedMessageMime = new Mime(
					"multipart/encrypted; protocol=\"application/pgp-encrypted\"",
					[
						new Mime("application/pgp-encrypted", "Version: 1"),
						new Mime("application/octet-stream", armored)
					]
				);

				callback(null, encryptedMessageMime);
			});
		});
	}
};

module.exports = Mailer;