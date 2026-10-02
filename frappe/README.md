# Frappe scripts for the Vue app

These files are not part of the Vue build. They are the Frappe side of quick
entry and are applied once, by hand, to the intranet app that serves
`muri.osaz.si`. Afterwards the Vue app talks to Frappe through the API and to
these endpoints, and nothing here needs touching again.

| File | Goes to | What it does |
|---|---|---|
| `intranet/api.py` | `intranet/api.py` | `verify_pin(pin)`, the guest endpoint the numpad calls |
| `intranet/patches/add_custom_added_by_to_dogodek.py` | `intranet/patches/add_custom_added_by_to_dogodek.py` | Adds the `Dodal` field to `Dogodek` |
| `HitriVpis.json` | imported as a DocType | The roster plus `pin` and `dovoljen`, in place of the hash columns |

## Why the PIN check lives here

Reports compares the PIN in Flask and never sends `teachers.json` to the
browser. The Vue app has no server of its own, so if the browser checked the
PIN it would have to download the PINs. Frappe does the compare instead, which
keeps the PINs server-side and makes the guest endpoint the only thing exposed.
That is the same trade reports makes, with Frappe in the role Flask had there.

## Apply it

```bash
# 1. endpoint and patch
cp frappe/intranet/api.py                          <bench>/apps/intranet/intranet/api.py
cp frappe/intranet/patches/add_custom_added_by_to_dogodek.py \
   <bench>/apps/intranet/intranet/patches/
echo "intranet.patches.add_custom_added_by_to_dogodek" >> <bench>/apps/intranet/intranet/patches.txt

# 2. roster DocType: pin + dovoljen replace pin_hash + sol
bench --site muri.osaz.si import-doctype frappe/HitriVpis.json
bench --site muri.osaz.si migrate

# 3. restart so the new endpoint is registered
bench --site muri.osaz.si restart
```

`verify_pin` is `@frappe.whitelist(allow_guest=True)` on purpose: the numpad is
used by teachers who are not logged into Frappe. It is throttled per client IP
and compares every row without early exit, so the response gives nothing away
about whether a PIN exists. Keep it that way, and keep the roster out of Guest
reach.

## After applying

Existing rows keep no PIN, so `pin_hash` and `sol` go away with the import and
the new `pin` column starts empty. Re-issue PINs in the Vue admin area
(`/admin/uporabniki`) - they were hashed under the old scheme and cannot be
converted. `dovoljen` defaults to 1, so existing users can log in as soon as
they have a PIN.

If `HitriVpis.json` is imported by hand, keep the `display`, `priimek_ime` and
`user` values; the import replaces the schema, not the rows.

## Test it

```bash
# wrong PIN, or a user with dovoljen = 0
curl -s -X POST https://muri.osaz.si/api/method/intranet.api.verify_pin \
  -H 'Content-Type: application/json' -d '{"pin":"000000"}'

# a PIN that is set, returns only the identity
curl -s -X POST https://muri.osaz.si/api/method/intranet.api.verify_pin \
  -H 'Content-Type: application/json' -d '{"pin":"123456"}'
```

A good reply is `{"message":{"ok":true,"user":{...}}}` and never contains a PIN
or a user list. After 10 attempts in a minute the reply is `{"ok":false,
"retry":true}` until the window rolls over.