import json, sys, urllib.request, urllib.error

config=json.load(sys.stdin)
base='https://api.telegram.org/bot'+config['token']+'/'
def call(method,payload=None):
 request=urllib.request.Request(base+method,data=json.dumps(payload or {}).encode(),headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(request,timeout=25) as response: data=json.load(response)
 except urllib.error.HTTPError as e:
  print(json.dumps({'method':method,'ok':False,'status':e.code,'description':json.load(e).get('description')},ensure_ascii=False))
  sys.exit(1)
 except Exception as e:
  print(json.dumps({'method':method,'ok':False,'error':type(e).__name__}))
  sys.exit(1)
 print(json.dumps({'method':method,'ok':data.get('ok'),'result':data.get('result')},ensure_ascii=False))
 if not data.get('ok'): sys.exit(1)
 return data['result']

if config.get('metadata'):
 call('setMyDescription',{'description':'Угадай страну по её контуру!\n\n20 вопросов: первые 5 — с вариантами ответа, следующие 15 — с вводом названия на русском. Застрял? Подсказка покажет количество букв, а каждая следующая откроет случайную букву. Только очертания, без флагов. Страны Африки не участвуют.\n\nНажми «Играть» в меню чата, чтобы начать.'})
 call('setMyShortDescription',{'short_description':'Угадай 20 стран по контурам: 5 с вариантами и 15 с вводом ответа и подсказками. Без стран Африки.'})
if config.get('url'):
 if not config.get('verify_only'):
  call('setChatMenuButton',{'menu_button':{'type':'web_app','text':'Играть','web_app':{'url':config['url']}}})
 result=call('getChatMenuButton')
 assert result.get('web_app',{}).get('url','').rstrip('/')==config['url'].rstrip('/')
 assert result.get('text')=='Играть'
