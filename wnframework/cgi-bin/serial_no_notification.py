import os, webnotes

class SerialGenerator:
	def __init__(self, ac_name, user, password):
		self.ac_name = ac_name
		self.user = user
		self.password = password
		import webnotes.db
		webnotes.conn = webnotes.db.Database(user=self.user, ac_name=self.ac_name, password=self.password)

	def update(self):
		serial_nos = webnotes.conn.sql(\
				"""SELECT name, warranty_expiry_date,\
					  amc_expiry_date, warranty_amc_status\
				   FROM `tabSerial No`\
				   WHERE ((DATEDIFF(NOW(),warranty_expiry_date) > 0)AND ifnull(amc_expiry_date, '') = '' AND warranty_amc_status != 'Out of Warranty')\
				   OR (DATEDIFF(NOW(), amc_expiry_date) > 0 AND warranty_amc_status != 'Out of AMC')\
				""")
		for s in serial_nos:
			new_status = ""
			if s[1] and not s[2] and s[3] != "Out of AMC":
				new_status = "Out of Warranty"
			elif s[2]:
				new_status = "Out of AMC"
			if new_status:
				webnotes.conn.sql(\
				"""UPDATE `tabSerial No`\
				   SET warranty_amc_status = '%s'\
				   WHERE name = '%s'
				""" % (new_status, s[0]))
				print "Updated %s: %s -> %s" % (s[0], s[3], new_status)
		webnotes.conn.close()
		

	def notify(self):
		import datetime
		from webnotes.utils import getdate
		serial_nos = webnotes.conn.sql(\
				"""SELECT name, warranty_expiry_date,\
					  amc_expiry_date, warranty_amc_status,\
					  brand, product_code,\
					  customer, territory\
				   FROM `tabSerial No`\
				   WHERE (((DATEDIFF(NOW(),warranty_expiry_date) between -30 and 365) AND ifnull(amc_expiry_date, '') = '')\
				   OR (DATEDIFF(NOW(), amc_expiry_date) between -30 and 365 AND warranty_amc_status = 'Under AMC'))\
				   AND warranty_amc_status in ('Under Warranty', 'Under AMC')\
				""", as_dict=1)
		for s in serial_nos:
			status = s['warranty_amc_status']
			try:
				amc_ex_date = getdate(s['amc_expiry_date'])
			except:
				amc_ex_date = s['amc_expiry_date']
			try:
				warranty_ex_date = getdate(s['warranty_expiry_date'])
			except:
				warranty_ex_date = s['warranty_expiry_date']
			days = 1 # intializing to 1 coz it wont be true even if we dont have warranty or expiry date
			if status == 'Under Warranty' and warranty_ex_date:
				days = (datetime.datetime.now().date() - warranty_ex_date).days
			elif status == 'Under AMC' and amc_ex_date:
				days = (datetime.datetime.now().date() - amc_ex_date).days
			if days % 30 == 0 and s['territory']:
				self.send_mail(s, days)


	def send_mail(self, serial_no_details, days):
		from webnotes.utils.email_lib import sendmail
		s = serial_no_details

		recipient_list = self.get_recipients(s['territory'], s['brand'])
		msg = """Dear All,

		This is to bring to your kind attention that %(status)s for %(brand)s, %(order_ref_code)s, %(serial_no)s of %(customer_name)s %(territory)s %(expiry_msg)s on %(date)s. You are requested to arrange for sending a quotation for AMC, also arrange for a visit to %(customer_name)s.

		With Best Regards,
		CRM Team
		""" % {	"status":s['warranty_amc_status'] == "Under Warranty" and "Warranty" or "AMC",
			"brand":s['brand'],
			"order_ref_code":s['product_code'],
			"serial_no":s['name'],
			"customer_name":s['customer'],
			"territory":s['territory'],
			"expiry_msg": (days > 0) and "expired" or "expires",
			"date":s['warranty_amc_status'] == "Under Warranty" and s['warranty_expiry_date'] or s['amc_expiry_date']
		      }
		subject = "%s expiry reminder of %s" % (s['warranty_amc_status'] == "Under Warranty" and "Warranty" or "AMC", s['name'])
		sendmail(recipients=recipient_list, msg=msg, subject=subject)


	def get_recipients(self, territory, brand):
		# Service Team
		service_team_list = webnotes.conn.sql(\
				"""SELECT profile FROM `tabTerritory Notification`\
				   WHERE parent = '%s'\
				   AND ifnull(profile,'') != ''\
				""" % territory)
		rlist = [i[0] for i in service_team_list]

		if brand:
			product_manager = webnotes.conn.sql(\
				"""SELECT profile\
				   FROM `tabBrand Notification`\
				   WHERE parent = '%s'\
				   AND ifnull(profile, '') != ''\
				""" % brand)
			for p in product_manager:
				rlist.append(p[0])	
		rlist.append('manisha_s@trimosmetrology.net')
		rlist.append('mehul_d@trimosmetrology.net')
		#rlist.append('dalal.saumil@gmail.com')
		return rlist


if __name__ == "__main__":
	import sys
	cmd = sys.argv[1]
	if cmd == "update":
		odb = SerialGenerator(sys.argv[2], sys.argv[3], sys.argv[4])
		odb.update()
	
	if cmd == "notify":
		odb = SerialGenerator(sys.argv[2], sys.argv[3], sys.argv[4])
		odb.notify()
