import json
import re
import sqlite3
import sys
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'ServerMod/PostRaid/EnvironmentalDeaths.cs').read_text()
query = re.search(r'LegacyQuery = """(.*?)"""', source, re.S).group(1)
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.executescript('''
CREATE TABLE player_status(raidId TEXT, profileId TEXT, time INTEGER, status TEXT);
CREATE TABLE kills(raidId TEXT, killedId TEXT);
CREATE TABLE comet_decision(id INTEGER PRIMARY KEY, raidId TEXT, profileId TEXT, time INTEGER, feature TEXT, reason TEXT, detail TEXT);
CREATE INDEX idx_comet_raid_profile_time_id ON comet_decision(raidId,profileId,time,id);
''')
def hit(profile, t, cause='HotGases', other=''):
    detail = json.dumps({'combatJournal': {'kind':'hit-taken','damageType':cause,'other':other}})
    db.execute('INSERT INTO comet_decision VALUES(NULL,?,?,?,?,?,?)', ('raid',profile,t,'T01','health-loss-observed',detail))
for name, status in [('gas1','Dead'),('gas2','1'),('alive','Alive'),('downed','Downed'),('extracted','Extracted'),('removed','Unspawned'),('old-hit','Dead'),('later-bullet','Dead'),('recorded','Dead')]:
    db.execute('INSERT INTO player_status VALUES(?,?,?,?)',('raid',name,1014659,status))
    hit(name, 1014550 if name!='old-hit' else 1013000)
hit('later-bullet',1014600,'Bullet')
db.execute('INSERT INTO kills VALUES(?,?)',('raid','recorded'))
db.execute('INSERT INTO player_status VALUES(?,?,?,?)',('other-raid','foreign',1014659,'Dead'))
rows = list(db.execute(query,{'id':'raid'}))
found={r['profileId'] for r in rows if r['detail'] and json.loads(r['detail'])['combatJournal']['damageType']=='HotGases'}
assert found=={'gas1','gas2'},found
assert any('idx_comet_raid_profile_time_id' in str(tuple(r)) for r in db.execute('EXPLAIN QUERY PLAN '+query,{'id':'raid'}))
print('Legacy gas SQL: paired deaths, status guards, newer damage, time window, existing kills and indexed lookup passed.')
if len(sys.argv)>1:
    live=sqlite3.connect(Path(sys.argv[1]).resolve().as_uri()+'?mode=ro',uri=True)
    live.row_factory=sqlite3.Row
    start=time.perf_counter()
    rows=list(live.execute(query,{'id':'f122beaa-db3d-44a5-afe4-7803a67f52f7'}))
    found=[{'profileId':r['profileId'],'time':r['time']} for r in rows if r['detail'] and json.loads(r['detail']).get('combatJournal',{}).get('damageType')=='HotGases']
    assert {r['profileId'] for r in found}=={'6afc4a99cd97d016fc47455d','6afc4a98cd97d016fc473588'},found
    print(json.dumps({'raid458':found,'queryMs':round((time.perf_counter()-start)*1000,2)}))
