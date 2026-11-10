"""Verify every normalized record against its originating Excel row."""
import json,math
from pathlib import Path
from collections import Counter
import openpyxl
ROOT=Path(__file__).resolve().parents[1]/'public/data'
index=json.loads((ROOT/'index.json').read_text());counts=Counter();odd=[]
books={k:openpyxl.load_workbook(ROOT/f'{k}.xlsx',read_only=True,data_only=True).active for k in ['mayors','councils']}
raw={k:list(s.iter_rows(values_only=True)) for k,s in books.items()}
for city in index['municipalities']:
 c=json.loads((ROOT/f"{city['code']}.json").read_text());assert c['code']==city['code']
 for kind in ['mayors','councils']:
  for e in c[kind]:
   r=raw[kind][e['row']-1];assert str(r[0]).split('.')[0].zfill(5)==c['code'];counts[kind]+=1
   if len(c['code'])!=5:odd.append((c['code'],c['name'],e['row']))
   if kind=='councils':
    assert e['total']==r[7] or e['total'] is None
    for party,n in e['seats'].items():
     col=raw[kind][0].index(party+'_当選者数');assert n==r[col] or (n is None and r[col] in (None,'')),(c['code'],e['row'],party)
   else:
    for candidate in e['candidates']:
     source=raw[kind][candidate['row']-1];assert candidate['name']==str(source[10]).strip().replace('\u3000',' ')
     assert candidate['elected']==(source[9] is True);counts['candidates']+=1
assert counts['mayors']==index['stats']['mayorElections'];assert counts['councils']==index['stats']['councilElections'];assert counts['candidates']==index['stats']['candidates']
print('PASS: all source rows, candidate names/election flags, and party seat counts verified:',dict(counts))
print('Non-standard municipality codes preserved from source:',odd)
