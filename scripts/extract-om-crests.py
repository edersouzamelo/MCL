"""Extract the official artwork and its actual exterior path from the supplied PDF.
Usage: python scripts/extract-om-crests.py /path/to/Organograma.pdf
Requires PyMuPDF and Pillow. No generated artwork or geometric shield template.
"""
import hashlib
import json
import sys
from pathlib import Path
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = "f0c44869cb17bba0d3100344a24aec7566442ed768b96425afe2f2697d5f0f9f"
# Drawing indices refer to the exact source SHA recorded in the catalog.
UNITS = [
 (44,'cmcg','CMCG','Colégio Militar de Campo Grande','Campo Grande',[]),
 (106,'13-bda-inf-mtz','13ª Bda Inf Mtz','13ª Brigada de Infantaria Motorizada','Cuiabá',['Cmdo 13ª Bda Inf Mtz']),
 (209,'58-bi-mtz','58º BI Mtz','58º Batalhão de Infantaria Motorizado','Aragarças',[]),
 (305,'c-fron-jauru-66-bi-mtz','C Fron Jauru / 66º BI Mtz','Comando de Fronteira Jauru / 66º Batalhão de Infantaria Motorizado','Cáceres',['66 BI MTZ', 'C FRON JAURU', 'Cmdo Fron Jauru / 66º BI Mtz', 'Cmdo Fron Jauru', 'Cmdo Fron- Jauru/66º BI Mtz']),
 (415,'18-gac','18º GAC','18º Grupo de Artilharia de Campanha','Rondonópolis',[]),
 (439,'13-pel-com','13º Pel Com','13º Pelotão de Comunicações','Cuiabá',[]),
 (473,'47-bi','47º BI','47º Batalhão de Infantaria','Coxim',[]),
 (563,'10-rc-mec','10º RC Mec','10º Regimento de Cavalaria Mecanizado','Bela Vista',[]),
 (638,'2-cia-fron','2ª Cia Fron','2ª Companhia de Fronteira','Corumbá',[]),
 (739,'11-rc-mec','11º RC Mec','11º Regimento de Cavalaria Mecanizado','Ponta Porã',[]),
 (853,'17-rc-mec','17º RC Mec','17º Regimento de Cavalaria Mecanizado','Amambai',[]),
 (1064,'20-rcb','20º RCB','20º Regimento de Cavalaria Blindado','Campo Grande',[]),
 (1152,'9-gac','9º GAC','9º Grupo de Artilharia de Campanha','Nioaque',[]),
 (1204,'28-b-log','28º B Log','28º Batalhão Logístico','Dourados',[]),
 (1226,'4-cia-e-cmb-mec','4ª Cia E Cmb Mec','4ª Companhia de Engenharia de Combate Mecanizada','Jardim',[]),
 (1334,'3-bia-aaa-e','3ª Bia AAAe','3ª Bateria de Artilharia Antiaérea','Três Lagoas',['3 BIA A AE']),
 (1420,'3-gpt-e','3º Gpt E','3º Grupamento de Engenharia','Campo Grande',[]),
 (1472,'9-be-cmb','9º BE Cmb','9º Batalhão de Engenharia de Combate','Aquidauana',[]),
 (1591,'9-be-c','9º BEC','9º Batalhão de Engenharia de Construção','Cuiabá',[]),
 (1645,'cro-9','CRO/9','Comissão Regional de Obras da 9ª Região Militar','Campo Grande',['CRO 9','CRO9']),
 (1653,'18-cia-com','18ª Cia Com','18ª Companhia de Comunicações','Corumbá',[]),
 (1685,'18-pel-pe','18º Pel PE','18º Pelotão de Polícia do Exército','Corumbá',[]),
 (1915,'3-b-av-ex','3º B Av Ex','3º Batalhão de Aviação do Exército','Campo Grande',[]),
 (2394,'9-gpt-log','9º Gpt Log','9º Grupamento Logístico','Campo Grande',['9 GPT LOG', 'GPT LOG', 'Cmdo 9º Gpt Log', 'Cmdo 9º Grupamento Logístico']),
 (2422,'9-bpe','9º BPE','9º Batalhão de Polícia do Exército','Campo Grande',[]),
 (2520,'4-bda-c-mec','4ª Bda C Mec','4ª Brigada de Cavalaria Mecanizada','Dourados',['Cmdo 4ª Bda C Mec']),
 (2564,'9-b-mnt','9º B Mnt','9º Batalhão de Manutenção','Campo Grande',[]),
 (2630,'9-b-sup','9º B Sup','9º Batalhão de Suprimento','Campo Grande',[]),
 (2652,'18-b-trnp','18º B Trnp','18º Batalhão de Transporte','Campo Grande',[]),
 (2749,'9-b-sau','9º B Sau','9º Batalhão de Saúde','Campo Grande',[]),
 (2797,'ciac-9-gpt-log','CIAC / 9º Gpt Log','Companhia de Comando do 9º Grupamento Logístico','Campo Grande',['CIA C 9 GPT LOG','CIAC 9 GPT LOG']),
 (2823,'18-bda-inf-pan','18ª Bda Inf Pan','18ª Brigada de Infantaria de Pantanal','Corumbá',['18 BDA INF PANTANAL', 'Cmdo 18ª Bda Inf Pantanal', 'Cmdo 18ª Bda Inf Pan']),
 (3174,'17-b-fron','17º B Fron','17º Batalhão de Fronteira','Corumbá',[]),
 (3196,'ciac-18-bda-inf-pan','Cia C / 18ª Bda Inf Pan','Companhia de Comando da 18ª Brigada de Infantaria de Pantanal','Corumbá',['CIAC 18 BDA INF PAN','CIAC 18 BDA INF PANTANAL']),
 (3527,'h-mil-a-cg','H Mil A CG','Hospital Militar de Área de Campo Grande','Campo Grande',['H MIL A CG','H MIL A C G','HMACG','HMILACG']),
 (3626,'9-b-com-ge','9º B Com GE','9º Batalhão de Comunicações e Guerra Eletrônica','Campo Grande',[]),
 (3654,'6-cta','6º CTA','6º Centro de Telemática de Área','Campo Grande',[]),
 (3682,'44-bi-mtz','44º BI Mtz','44º Batalhão de Infantaria Motorizado','Cuiabá',[]),
 (3752,'13-pel-pe','13º Pel PE','13º Pelotão de Polícia do Exército','Cuiabá',[]),
 (3949,'ciac-13-bda-inf-mtz','Cia C / 13ª Bda Inf Mtz','Companhia de Comando da 13ª Brigada de Infantaria Motorizada','Cuiabá',['CIAC 13 BDA INF MTZ']),
 (4091,'b-adm-ap-cmo','B Adm Ap CMO','Base de Administração e Apoio do Comando Militar do Oeste','Campo Grande',['B ADM AP CMO', 'B ADM AP/CMO', 'B ADMIN AP CMO', 'Ba Adm Ap / CMO', 'Ba Adm Ap CMO']),
 (4261,'cmo','CMO','Comando Militar do Oeste','Campo Grande',[]),
 (4277,'9-cgcfex','9º CGCFEx','9º Centro de Gestão, Contabilidade e Finanças do Exército','Campo Grande',[]),
 (4356,'esqd-c-4-bda-c-mec','Esqd C / 4ª Bda C Mec','Esquadrão de Comando da 4ª Brigada de Cavalaria Mecanizada','Dourados',['ESQD C 4 BDA C MEC']),
 (4486,'4-pel-pe-mec','4º Pel PE Mec','4º Pelotão de Polícia do Exército Mecanizado','Dourados',[]),
 (4738,'14-cia-com-mec','14ª Cia Com Mec','14ª Companhia de Comunicações Mecanizada','Dourados',[]),
 (4819,'cibt','CIBT','Centro de Instrução Barão de Três Barras','Miranda',[]),
 (4844,'6-bim','6º BIM','6º Batalhão de Inteligência Militar','Campo Grande',[]),
 (4931,'9-rm','9ª RM','9ª Região Militar','Campo Grande',['Cmdo 9ª RM']),
 (4315,'tg-09-001','TG 09-001','Tiro de Guerra 09-001','Alta Floresta',[]),
 (4323,'tg-09-002','TG 09-002','Tiro de Guerra 09-002','Sinop',[]),
 (4331,'tg-09-003','TG 09-003','Tiro de Guerra 09-003','Colíder',[]),
 (4340,'tg-09-004','TG 09-004','Tiro de Guerra 09-004','Juara',[]),
 (4983,'tg-09-005','TG 09-005','Tiro de Guerra 09-005','Juína',[]),
]

def exterior(items):
    # The first closed subpath is the official outside contour. Later subpaths
    # are interior cutouts of the gold border, not holes in the shield artwork.
    start = items[0][1]
    result = []
    for item in items:
        if item[0] not in ('l','c'): break
        result.append(item)
        if abs(item[-1] - start) < .02: break
    return result

def extract(pdf):
    raw = pdf.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('PDF diferente da fonte catalogada. Revise os índices e identidades antes de extrair.')
    document = fitz.open(pdf); page = document[0]; drawings = page.get_drawings()
    dest = ROOT / 'public/om-crests'; dest.mkdir(parents=True, exist_ok=True)
    records = []
    for index, slug, acronym, name, city, aliases in UNITS:
        drawing = drawings[index]; contour = exterior(drawing['items']); rect = drawing['rect'] + (-.35,-.35,.35,.35)
        factor = 8
        pixels = page.get_pixmap(matrix=fitz.Matrix(factor,factor), clip=rect, alpha=False)
        artwork = Image.frombytes('RGB', (pixels.width,pixels.height), pixels.samples).convert('RGBA')
        maskdoc = fitz.open(); maskpage = maskdoc.new_page(width=page.rect.width,height=page.rect.height); shape=maskpage.new_shape()
        for item in contour:
            if item[0]=='l': shape.draw_line(item[1],item[2])
            elif item[0]=='c': shape.draw_bezier(*item[1:])
        shape.finish(fill=(1,1,1),color=None,closePath=True); shape.commit()
        maskpix=maskpage.get_pixmap(matrix=fitz.Matrix(factor,factor),clip=rect,alpha=True)
        mask = Image.frombytes('RGBA',(maskpix.width,maskpix.height),maskpix.samples).getchannel('A')
        artwork.putalpha(mask); artwork.save(dest / f'{slug}.png', optimize=True)
        records.append(dict(id=slug, acronym=acronym, name=name, city=city, aliases=aliases, image=f'/om-crests/{slug}.png', sourceDrawing=index, sourceBounds=[round(v,4) for v in drawing['rect']], width=artwork.width,height=artwork.height))
    catalog = dict(version=1,source=dict(fileName=pdf.name,sha256=hashlib.sha256(raw).hexdigest(),page=1),units=records)
    (ROOT/'src/modules/grupamento/om-crests.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print(f'Extracted {len(records)} original emblems with exterior-path transparency.')
if __name__=='__main__':extract(Path(sys.argv[1]))
