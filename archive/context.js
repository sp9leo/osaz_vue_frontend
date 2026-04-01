# 1. Filtri
search_query = frappe.form_dict.get('q')
selected_category = frappe.form_dict.get('category')

db_filters = {'status': 'Open'}
if search_query:
    db_filters["subject"] = ["like", f"%{search_query}%"]
if selected_category:
    db_filters["event_category"] = selected_category

# 2. Pridobivanje podatkov
events = frappe.db.get_all(
    "Dogodek",
    fields=["name", "subject", "starts_on", "ends_on", "description", "event_category", "color"],
    order_by="starts_on asc",
    filters=db_filters
)

now = frappe.utils.now_datetime()
grouped_dict = {}
month_counts = {}

# 3. Grupiranje in štetje
for e in events:
    start_str = str(e.starts_on)
    end_str = str(e.ends_on) if e.get("ends_on") else start_str
    e.starts_on = frappe.utils.get_datetime(e.starts_on)
    date_key = frappe.utils.get_date_str(e.starts_on)
    month_key = date_key[:7] # YYYY-MM
    e.is_multiday = (start_str[:10] != end_str[:10])
    
    # Zastavice
    e.is_now = (e.starts_on <= now <= (frappe.utils.get_datetime(e.ends_on) if e.ends_on else e.starts_on))
    
    grouped_dict.setdefault(date_key, []).append(e)
    month_counts[month_key] = month_counts.get(month_key, 0) + 1

# 4. Kolekcija za Jinja
events_list_collection = []
for date in sorted(grouped_dict.keys(), reverse=True):
    events_list_collection.append({
        "date_group": date,
        "events": grouped_dict[date],
        "month_num": date[5:7],
        "year": date[0:4],
        "month_key": date[:7]
    })

context.grouped_events = events_list_collection
context.month_counts = month_counts

# Kategorije za dropdown
meta = frappe.get_meta("Dogodek")
context.categories = [
    c.name for c in frappe.get_all("Event Type", fields=["name"])
]

context.current_path = frappe.request.path