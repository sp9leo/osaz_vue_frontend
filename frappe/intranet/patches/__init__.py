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