"""Render the existing public Word resume as a self-contained, two-page PDF.

The Word document remains the content source; no private contact data is added.
Requires reportlab. Run from any directory with Python 3.
"""
from pathlib import Path
from zipfile import ZipFile
import re
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

import reportlab
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'MyPersonalSite/wwwroot/resume/jrp_resume_20260128.docx'
OUTPUT = SOURCE.with_name('justin-palmer-resume.pdf')
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with ZipFile(SOURCE) as archive:
    xml = ET.fromstring(archive.read('word/document.xml'))
paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t', NS)).strip()
              for p in xml.findall('.//w:p', NS)]
paragraphs = [re.sub('[\u2010-\u2015]', '-', p) for p in paragraphs if p]
if re.search(r'[A-Za-z0-9_.+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', ' '.join(paragraphs)):
    raise ValueError('A public resume must not contain an email address')

FONT_DIR = Path(reportlab.__file__).parent / 'fonts'
pdfmetrics.registerFont(TTFont('PortfolioSans', str(FONT_DIR / 'Vera.ttf')))
pdfmetrics.registerFont(TTFont('PortfolioSans-Bold', str(FONT_DIR / 'VeraBd.ttf')))
pdfmetrics.registerFontFamily('PortfolioSans', normal='PortfolioSans', bold='PortfolioSans-Bold')

INK = colors.HexColor('#202b27')
GREEN = colors.HexColor('#32644d')
MUTED = colors.HexColor('#526057')
LINE = colors.HexColor('#dce2dc')
styles = {
    'section': ParagraphStyle('section', fontName='PortfolioSans-Bold', fontSize=9,
        leading=13, textColor=GREEN, spaceBefore=12, spaceAfter=6, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='PortfolioSans', fontSize=8.6,
        leading=12.3, textColor=INK, spaceAfter=5, alignment=TA_LEFT),
    'bullet': ParagraphStyle('bullet', fontName='PortfolioSans', fontSize=8.5,
        leading=12.1, textColor=INK, leftIndent=11, firstLineIndent=-9, spaceAfter=4),
    'role': ParagraphStyle('role', fontName='PortfolioSans-Bold', fontSize=11,
        leading=15, textColor=INK, spaceBefore=10, spaceAfter=3, keepWithNext=True),
    'date': ParagraphStyle('date', fontName='PortfolioSans', fontSize=8.8,
        leading=13, textColor=MUTED, spaceAfter=9, keepWithNext=True),
}

def page(canvas, doc):
    canvas.setTitle('Justin Palmer - Resume')
    canvas.setAuthor('Justin Palmer')
    canvas.setStrokeColor(LINE)
    canvas.line(44, 713, 568, 713)
    canvas.setFillColor(INK)
    canvas.setFont('PortfolioSans-Bold', 22 if doc.page == 1 else 14)
    canvas.drawString(44, 750, 'Justin Palmer')
    canvas.setFont('PortfolioSans', 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(44, 732, 'Software Engineering / Cloud & Data Architecture')
    canvas.drawRightString(568, 750, 'justinraypalmer.com/contact')
    canvas.linkURL('https://justinraypalmer.com/contact', (420, 745, 568, 760))
    canvas.line(44, 43, 568, 43)
    canvas.setFont('PortfolioSans', 8)
    canvas.drawString(44, 29, 'Justin Palmer  |  justinraypalmer.com')
    canvas.drawRightString(568, 29, f'{doc.page}')

story = []
section = ''
roles = [
    ('U.S. Department of the Treasury', 'Senior Cloud Engineer / Technical Lead', 'Nov 2022 - Present'),
    ('Internal Revenue Service', 'Senior Data Engineer / Analyst', 'Jun 2019 - Nov 2022'),
    ('Internal Revenue Service', 'Operations Research Analyst', 'Nov 2017 - Jun 2019'),
]
for text in paragraphs[1:]:
    if text in ['PROFESSIONAL PROFILE', 'TECHNICAL SKILLS', 'PROFESSIONAL EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS']:
        section = text
        story.append(Paragraph(escape(text), styles['section']))
        continue
    match = next((role for role in roles if text.startswith(role[0] + ' ' + role[1])), None)
    if match:
        employer, title, date = match
        if title == 'Senior Data Engineer / Analyst':
            story.append(PageBreak())
            story.append(Paragraph('PROFESSIONAL EXPERIENCE / CONTINUED', styles['section']))
        story.append(Paragraph(escape(title), styles['role']))
        story.append(Paragraph(escape(employer + '  |  ' + date), styles['date']))
        continue
    if section == 'EDUCATION' and 'Bachelor of Science' in text:
        first, second = text.split('Bachelor of Science', 1)
        for item in [first, 'Bachelor of Science' + second]:
            story.append(Paragraph(escape(item.strip()), styles['body']))
    elif section == 'PROFESSIONAL EXPERIENCE':
        story.append(Paragraph('- ' + escape(text), styles['bullet']))
    else:
        formatted = escape(text)
        if section == 'TECHNICAL SKILLS' and ':' in text:
            label, detail = text.split(':', 1)
            formatted = '<b>' + escape(label) + ':</b>' + escape(detail)
        story.append(Paragraph(formatted, styles['body']))

doc = SimpleDocTemplate(str(OUTPUT), pagesize=letter, leftMargin=44, rightMargin=44,
    topMargin=88, bottomMargin=56, pageCompression=1)
doc.build(story, onFirstPage=page, onLaterPages=page)
print(f'Created {OUTPUT.relative_to(ROOT)}')
