# 1. Pridobivanje filtrov
search_query = frappe.form_dict.get('q')
selected_category = frappe.form_dict.get('category')

# 2. Priprava filtrov za bazo
db_filters = {'status': 'Open'}
if search_query:
    db_filters["subject"] = ["like", f"%{search_query}%"]
if selected_category:
    db_filters["event_category"] = selected_category

# 3. Pridobivanje dogodkov
events_list = frappe.db.get_all(
    "Dogodek",
    fields=["name", "subject", "starts_on", "ends_on", "description", "event_category", "color", "status","modified", "location", "custom_predvideno"],
    order_by="starts_on asc",
    filters={
        "ends_on": [">=", frappe.utils.today()],
        "status":"open",
        "published": 1
    },
)

# ... (tvoj obstoječi del za is_now, is_today, is_multiday ostane enak) ...
now_str = str(frappe.utils.now_datetime())
today_str = now_str[:10]
grouped_dict = {}

for e in events_list:
    start_str = str(e.starts_on)
    end_str = str(e.ends_on) if e.get("ends_on") else start_str
    e.is_now = (start_str <= now_str <= end_str)
    e.is_today = (start_str[:10] == today_str)
    e.is_multiday = (start_str[:10] != end_str[:10])
    date_key = start_str[:10]
    grouped_dict.setdefault(date_key, []).append(e)

for date in grouped_dict:
    grouped_dict[date] = sorted(grouped_dict[date], key=lambda ev: str(ev.starts_on), reverse=False)

events_list_collection = []
for date in sorted(grouped_dict.keys(), reverse=False):
    events_list_collection.append({"date_group": date, "events": grouped_dict[date]})

context.grouped_events = events_list_collection

# 4. Gradnja kategorij (vedno iz vseh Open dogodkov)
all_categories = frappe.get_all("Dogodek", 
    fields=["distinct event_category"], 
    filters={"status": "Open", "event_category": ["!=", ""]}
)
context.categories = [c.event_category for c in all_categories]

# 5. Shranimo filtre in pot strani
context.active_query = search_query
context.active_category = selected_category
# path nam pove, na kateri strani smo (npr. /aktivnosti)
context.current_path = frappe.request.path

