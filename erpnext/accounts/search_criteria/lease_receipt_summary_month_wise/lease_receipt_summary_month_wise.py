data =[
		['Month','Data','100px',''],
		['Year','Data','100px',''],
		['Amount','Currency','120px','']
	]

for d in data:
	colnames.append(d[0])
	coltypes.append(d[1])
	colwidths.append(d[2])
	coloptions.append(d[3])
	col_idx[d[0]] = len(colnames)-1

