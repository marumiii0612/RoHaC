"""Convert original election workbooks without inferring political alliances.
Usage: python scripts/import_data.py MAYOR.xlsx COUNCIL.xlsx
Requires openpyxl. Original files are retained for download.
"""
import sys,json,datetime,re,unicodedata,shutil
from pathlib import Path
from collections import Counter
import openpyxl
OUT=Path(__file__).resolve().parents[1]/'public'/'data'
PREFS='北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split()
DB={}; stats=Counter()
def text(v):return '' if v is None else str(v).strip()
def number(v):
 try:
  n=float(str(v).replace(',',''));return int(n) if n.is_integer() else n
 except (ValueError,TypeError):return None
def flag(v):return v is True or v==1 or text(v).lower()=='true'
def date(v):
 if isinstance(v,(datetime.datetime,datetime.date)):return v.strftime('%Y-%m-%d'),v.year,True
 raw=text(v); norm=unicodedata.normalize('NFKC',raw)
 m=re.fullmatch(r'(\d{4})[/.年-](\d{1,2})[/.月-](\d{1,2})日?',norm)
 if m:
  try:
   d=datetime.date(*map(int,m.groups()));return d.isoformat(),d.year,True
  except ValueError:pass
 m=re.search(r'(?:19|20)\d{2}',norm); y=int(m[0]) if m else None
 if not y:
  m=re.search(r'(昭和|平成|令和|[sShH])(\d+)',norm)
  if m:y={'昭和':1925,'平成':1988,'令和':2018,'s':1925,'h':1988}[m[1].lower()]+int(m[2])
 return raw or '日付不明',y,False
def city(code,name):
 code=text(code).split('.')[0].zfill(5)
 if code not in DB:DB[code]={'code':code,'name':text(name),'prefecture':PREFS[int(code[:2])-1] if code[:2].isdigit() and 1<=int(code[:2])<=47 else '不明','mayors':[],'councils':[]}
 return DB[code]
def rows(path):return openpyxl.load_workbook(path,read_only=True,data_only=True).active.iter_rows(values_only=True)
OUT.mkdir(parents=True,exist_ok=True)
it=rows(sys.argv[1]);h=next(it); current=None
for rowno,r in enumerate(it,2):
 if r[0] is not None:
  c=city(r[0],r[1]);d,y,exact=date(r[2]);current={'date':d,'year':y,'exactDate':exact,'turnout':number(r[6]),'uncontested':flag(r[7]),'note':text(r[8]),'candidates':[],'row':rowno};c['mayors'].append(current);stats['mayorElections']+=1
 if current is not None and r[10]:
  current['candidates'].append({'name':text(r[10]).replace('\u3000',' '),'elected':flag(r[9]),'votes':number(r[11]),'share':number(r[12]),'parties':[h[i] for i in range(13,21) if flag(r[i])],'otherParty':text(r[21]),'note':text(r[22]),'row':rowno});stats['candidates']+=1
it=rows(sys.argv[2]);h=next(it)
partycols=[(i,k.split('_')[0]) for i,k in enumerate(h) if k and k.endswith('_当選者数')]
for rowno,r in enumerate(it,2):
 if r[0] is None:stats['councilRowsWithoutCode']+=1;continue
 c=city(r[0],r[1]);d,y,exact=date(r[2]);seats={p:number(r[i]) for i,p in partycols};total=number(r[7]);known=sum(v for v in seats.values() if v is not None)
 c['councils'].append({'date':d,'year':y,'exactDate':exact,'turnout':number(r[6]),'total':total,'candidates':number(r[8]),'uncontested':flag(r[9]),'byElection':flag(r[10]),'expanded':flag(r[11]),'special':flag(r[12]),'note':text(r[13]),'seats':seats,'unclassified':max(0,total-known) if total is not None else None,'seatMismatch':total is not None and known>total,'otherParty':text(r[50]),'row':rowno});stats['councilElections']+=1
index=[]
for code,c in DB.items():
 for kind in ['mayors','councils']:c[kind].sort(key=lambda e:(e['year'] or 0,e['date']))
 years=[e['year'] for k in ['mayors','councils'] for e in c[k] if e['year']]
 c['firstYear']=min(years) if years else None;c['lastYear']=max(years) if years else None
 (OUT/f'{code}.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':')))
 index.append({k:c[k] for k in ['code','name','prefecture','firstYear','lastYear']}|{'mayorCount':len(c['mayors']),'councilCount':len(c['councils'])})
manifest={'municipalities':sorted(index,key=lambda c:c['code']),'prefectures':PREFS,'stats':dict(stats),'municipalityCount':len(DB),'sources':[('2017izen_kubicyou_senkyodata_20250128.xlsx' if i==0 else 'gikaigiinnsennkyo_20250124.xlsx') if Path(f).name in ('mayors.xlsx','councils.xlsx') else Path(f).name for i,f in enumerate(sys.argv[1:3])],'note':'市町村コードで結合。合併前後でコードが異なる自治体は別に掲載。議会は選挙時の当選者数であり現在の会派構成ではない。'}
(OUT/'index.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
for i,f in enumerate(sys.argv[1:3]):
 dest=OUT/('mayors.xlsx' if i==0 else 'councils.xlsx')
 if Path(f).resolve()!=dest.resolve():shutil.copyfile(f,dest)
print(json.dumps({'municipalities':len(DB),'stats':dict(stats),'yokohama':[(c['code'],c['name']) for c in DB.values() if c['name']=='横浜市']},ensure_ascii=False))
