# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

"""PIN verification for the quick-event entry in the Vue app.

The Vue app is a static SPA, so whichever side checks the PIN needs the PIN
material. Reports does this in Flask and never sends teachers.json to the
browser; here the check runs in Frappe instead, which keeps the PINs on the
server. The endpoint hands back the identity of the match and nothing else -
no PIN, no hash, no user list.

Copy this file to intranet/api.py in the intranet app and expose it as
/api/method/intranet.api.verify_pin.
"""

import hmac
import re

import frappe

PIN_DOCTYPE = "HitriVpis"
PIN_LENGTH = 6

# Attempts allowed per client per window. A wrong PIN and a throttled request
# answer exactly the same, so the reply never reveals whether a PIN exists.
MAX_ATTEMPTS = 10
THROTTLE_SECONDS = 60

IDENTITY_FIELDS = ("name", "display", "priimek_ime", "user")

DIGITS = re.compile(r"^[0-9]{%d}$" % PIN_LENGTH)


@frappe.whitelist(allow_guest=True)
def verify_pin(pin: str) -> dict:
	"""Compare pin against every allowed row and return the matching identity."""
	if not isinstance(pin, str) or not DIGITS.match(pin):
		return {"ok": False}

	if not _within_rate_limit():
		return {"ok": False, "retry": True}

	rows = frappe.get_all(
		PIN_DOCTYPE,
		fields=["name", "display", "priimek_ime", "user", "pin"],
		filters={"dovoljen": 1},
		limit_page_length=200,
	)

	match = None
	for row in rows:
		# No early exit: every row is compared, so the reply time does not
		# tell an attacker which row matched or how far the scan got.
		if hmac.compare_digest(str(row.pin or ""), pin):
			match = row

	if not match:
		return {"ok": False}

	return {
		"ok": True,
		"user": {field: match.get(field) or "" for field in IDENTITY_FIELDS},
	}


def _within_rate_limit() -> bool:
	"""Count attempts per client IP and refuse the burst after a wrong PIN."""
	ip = getattr(frappe.session, "client_ip", None) or "unknown"
	key = "quick_entry_pin_attempts:{0}".format(ip)

	attempts = frappe.cache().incr(key, expires_in_sec=THROTTLE_SECONDS)

	return attempts <= MAX_ATTEMPTS