# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

"""Add custom_added_by to Dogodek.

Frappe always sets owner to the authenticated user, and quick entry posts with
the shared API key, so owner ends up being the API key admin. The Vue app
writes the PIN user's identity into custom_added_by instead and reads it back
when listing events.

Run it either as a patch, by adding the line below to patches.txt in the
intranet app:

    [post_model_sync]
    intranet.patches.add_custom_added_by_to_dogodek

or on its own:

    bench --site muri.osaz.si execute intranet.patches.add_custom_added_by_to_dogodek.execute
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	create_custom_fields(
		{
			"Dogodek": [
				{
					"fieldname": "custom_added_by",
					"label": "Dodal",
					"fieldtype": "Data",
					"length": 140,
					"insert_after": "location",
					"print_on": 0,
					"translatable": 0,
				}
			]
		},
		ignore_validate=True,
	)