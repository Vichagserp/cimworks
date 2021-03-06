cur_frm.cscript.tname = "Service Quotation Detail";
cur_frm.cscript.fname = "service_quotation_details";
cur_frm.cscript.other_fname = "other_charges";
cur_frm.cscript.sales_team_fname = "sales_team";

$import(Sales Common)
$import(Other Charges)
$import(SMS Control)

// ONLOAD
// ===================================================================================
cur_frm.cscript.onload = function(doc, cdt, cdn) {  
  if(!doc.status) set_multiple(cdt,cdn,{status:'Open'});
  if(!doc.transaction_date) set_multiple(cdt,cdn,{transaction_date:get_today()});
  if(!doc.conversion_rate) set_multiple(cdt,cdn,{conversion_rate:'1.00'});
  if(!doc.currency && sys_defaults.currency) set_multiple(cdt,cdn,{currency:sys_defaults.currency});
  if(!doc.company && sys_defaults.company) set_multiple(cdt,cdn,{company:sys_defaults.company});
  if(!doc.fiscal_year && sys_defaults.fiscal_year) set_multiple(cdt,cdn,{fiscal_year:sys_defaults.fiscal_year});
  
}

cur_frm.cscript.refresh = function(doc, cdt, cdn) {
  if(doc.quotation_type == 'Others')
    unhide_field('others_detail');

  cur_frm.clear_custom_buttons();
 
  if(doc.docstatus == 1 && doc.status != 'Closed'){
    cur_frm.add_custom_button('Make Service Order', cur_frm.cscript['Make Service Order']);
    cur_frm.add_custom_button('Send SMS', cur_frm.cscript['Send SMS']);
  }
    
 // if(inList(user_roles, 'CRM Manager')) {
 //   hide_field('Send For Approval');
 //   unhide_field('Send Feedback');
 // }
 // else {
 //   unhide_field('Send For Approval');
 //   hide_field('Send Feedback');
 // }
}

//customer
cur_frm.cscript.customer = function(doc,dt,dn) {
  var callback = function(r,rt) {
      var doc = locals[cur_frm.doctype][cur_frm.docname];
      cur_frm.refresh();
  }

  if(doc.customer) $c_obj(make_doclist(doc.doctype, doc.name), 'get_default_customer_address', '', callback);
  if(doc.customer) unhide_field(['customer_address','contact_person','customer_name','address_display','contact_display','contact_mobile','contact_email', 'contact_department', 'contact_designation', 'territory','customer_group', 'zone']);
}

cur_frm.cscript.customer_address = cur_frm.cscript.contact_person = function(doc,dt,dn) {
  if(doc.customer) get_server_fields('get_customer_address', JSON.stringify({customer: doc.customer, address: doc.customer_address, contact: doc.contact_person}),'', doc, dt, dn, 1);
}

cur_frm.fields_dict.customer_address.on_new = function(dn) {
  locals['Address'][dn].customer = locals[cur_frm.doctype][cur_frm.docname].customer;
  locals['Address'][dn].customer_name = locals[cur_frm.doctype][cur_frm.docname].customer_name;  
}

cur_frm.fields_dict.contact_person.on_new = function(dn) {
  locals['Contact'][dn].customer = locals[cur_frm.doctype][cur_frm.docname].customer;
  locals['Contact'][dn].customer_name = locals[cur_frm.doctype][cur_frm.docname].customer_name;  
}

cur_frm.fields_dict['customer_address'].get_query = function(doc, cdt, cdn) {
  return 'SELECT name,address_line1,city FROM tabAddress WHERE customer = "'+ doc.customer +'" AND docstatus != 2 AND name LIKE "%s" ORDER BY name ASC LIMIT 50';
}

cur_frm.fields_dict['contact_person'].get_query = function(doc, cdt, cdn) {
  return 'SELECT name,CONCAT(first_name," ",ifnull(last_name,"")) As FullName,department,designation FROM tabContact WHERE customer = "'+ doc.customer +'" AND docstatus != 2 AND name LIKE "%s" ORDER BY name ASC LIMIT 50';
}

//lead
cur_frm.fields_dict['lead'].get_query = function(doc,cdt,cdn){
  return 'SELECT `tabLead`.name, `tabLead`.lead_name FROM `tabLead` WHERE `tabLead`.%(key)s LIKE "%s"  ORDER BY  `tabLead`.`name` ASC LIMIT 50';
}

cur_frm.cscript.lead = function(doc, cdt, cdn) {
  if(doc.lead) get_server_fields('get_lead_details', doc.lead,'', doc, cdt, cdn, 1);
  if(doc.lead) unhide_field(['lead_name','address_display','contact_mobile','contact_email','contact_designation', 'contact_department','territory']);  
}


/*----------------Make Service Order Mapper-------------------------------------------------------------------------*/

cur_frm.cscript['Make Service Order'] = function() {
  var doc = cur_frm.doc;
  if(doc.docstatus == 1){
    n = createLocal("Service Order");
    $c('dt_map', args={
	  'docs':compress_doclist([locals["Service Order"][n]]),
	  'from_doctype':'Service Quotation',
	  'to_doctype':'Service Order',
	  'from_docname':doc.name,
      'from_to_list':"[['Service Quotation', 'Service Order'], ['Service Quotation Detail', 'Service Order Detail'],['RV Tax Detail','RV Tax Detail'], ['Sales Team', 'Sales Team'],['TC Detail','TC Detail']]"
    }
    , function(r,rt) {
      loaddoc("Service Order", n);
      }
    );
  }
}

//------------------------pull serial details-----------------------------

cur_frm.cscript.serial_no = function(doc, cdt, cdn) {
  var d = locals[cdt][cdn];
  get_server_fields('get_serial_details', d.serial_no,'service_quotation_details',doc, cdt, cdn, 1);
}

// -------------------------------set qty and rate ----------------------------

cur_frm.cscript.amount = function(doc, cdt, cdn) {
  var d = locals[cdt][cdn];
  ret = {'qty':1, 'basic_rate':d.amount};
  set_multiple('Service Quotation Detail', d.name, ret, 'service_quotation_details');
  cur_frm.cscript.recalc(doc, 4);
}

// -------------------------------display others detail----------------------------
cur_frm.cscript.quotation_type = function(doc,cdt,cdn) {
  if (doc.quotation_type == 'Others') {
    unhide_field('others_detail');
  } else {
    hide_field('others_detail');
  }
}

//----------------------------Validate-------------------------------------------------
/*
cur_frm.cscript.validate = function(doc,cdt,cdn) {
  if (doc.quotation_type == 'Others' && ! doc.others_detail) {
    msgprint("Please enter 'Others Detail' in 'Quotation'");
    validated = false;
  }
}
*/
