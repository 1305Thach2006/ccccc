from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel
from typing import List
import ollama
import json
import re
import os
import random
import hashlib
import urllib.request
import threading
import traceback
from datetime import datetime, timedelta, timezone

# ==========================================
# MÚI GIỜ VIỆT NAM (UTC+7) CHUẨN XÁC CHO DOCKER & LOCAL
# ==========================================
VN_TZ = timezone(timedelta(hours=7))

def vn_now() -> datetime:
    """Luôn trả về thời gian thực theo múi giờ Việt Nam (UTC+7) dạng naive datetime."""
    return datetime.now(VN_TZ).replace(tzinfo=None)

# ==========================================
# PHẦN 1: CẤU HÌNH DATABASE & KẾT NỐI OLLAMA THÔNG MINH
# ==========================================
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://admin:secretpassword123@localhost:5433/career_coach"
)
_connect_args = {"connect_timeout": 3} if SQLALCHEMY_DATABASE_URL.startswith("postgresql") else {"check_same_thread": False}
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# KHO TỪ ĐIỂN KỸ NĂNG ĐA NGÀNH (15+ LĨNH VỰC) & NLP TRÍCH XUẤT TỰ DO
# ==========================================
UNIVERSAL_SKILL_CATALOG = {
    # 1. CNTT / Phần mềm / Web / Mobile
    "Python": ["python", "django", "flask", "fastapi"],
    "FastAPI": ["fastapi"],
    "PHP": ["php"],
    "Laravel": ["laravel"],
    "Java": ["java ", "java,", "spring boot", "springboot", "j2ee", "hibernate"],
    "C# / .NET": ["c#", ".net", "asp.net", "entity framework"],
    "C / C++": ["c++", "c/c++", "embedded"],
    "JavaScript": ["javascript", "es6", "js "],
    "TypeScript": ["typescript", "ts "],
    "ReactJS / Next.js": ["react", "reactjs", "next.js", "nextjs", "redux"],
    "VueJS / Nuxt": ["vue", "vuejs", "nuxt"],
    "Angular": ["angular"],
    "Node.js / Express": ["node.js", "nodejs", "express.js", "nestjs"],
    "HTML/CSS": ["html", "css", "scss", "sass", "responsive"],
    "Tailwind CSS": ["tailwind", "tailwindcss", "bootstrap"],
    "RESTful API": ["rest api", "restful", "api", "graphql", "postman"],
    "MySQL": ["mysql"],
    "PostgreSQL": ["postgresql", "postgres"],
    "SQL / Cơ sở dữ liệu": ["sql", "database", "csdl", "nosql", "mongodb", "redis", "oracle", "sql server"],
    "Git / Quản lý mã nguồn": ["git", "github", "gitlab", "bitbucket"],
    "Docker / DevOps": ["docker", "kubernetes", "k8s", "ci/cd", "jenkins", "devops", "linux"],
    "Cloud (AWS / Azure / GCP)": ["aws", "azure", "gcp", "cloud"],
    "Unit Test / Kiểm thử (QA/QC)": ["unit test", "phpunit", "pytest", "jest", "testing", "qa", "qc", "tester", "selenium", "kiểm thử"],
    "Agile / Scrum": ["agile", "scrum", "jira", "kanban"],
    "AI / Machine Learning": ["machine learning", "deep learning", "ai ", "artificial intelligence", "nlp", "llm", "computer vision", "pytorch", "tensorflow"],
    "An toàn thông tin / Bảo mật": ["security", "bảo mật", "an toàn thông tin", "owasp", "pentest"],

    # 2. Dữ liệu / Phân tích kinh doanh (BA / Data)
    "Power BI": ["power bi", "powerbi", "dax"],
    "Tableau": ["tableau"],
    "Phân tích dữ liệu (Data Analysis)": ["phân tích dữ liệu", "data analysis", "data analyst", "etl", "data warehouse", "bi "],
    "Business Analysis (BA)": ["business analyst", "phân tích nghiệp vụ", "erd", "uml", "bpmn", "use case", "srs", "brd"],

    # 3. Kinh tế / Tài chính / Kế toán / Kiểm toán / Ngân hàng
    "Kế toán tổng hợp": ["kế toán tổng hợp", "kế toán", "general accountant", "accounting", "hạch toán", "chứng từ"],
    "MISA / Phần mềm ERP": ["misa", "fast accounting", "sap", "erp", "bravo"],
    "Excel nâng cao": ["excel", "vlookup", "pivot table", "macro", "vba", "google sheets"],
    "Phân tích báo cáo tài chính": ["báo cáo tài chính", "phân tích tài chính", "financial analysis", "financial report", "cơ cấu vốn", "dòng tiền", "cashflow"],
    "Lập dự toán & Ngân sách": ["dự toán", "ngân sách", "budget", "budgeting", "forecasting", "kế hoạch tài chính"],
    "Thuế & Quyết toán thuế": ["thuế", "tax", "gtgt", "vat", "tndn", "tncn", "quyết toán thuế", "kê khai thuế"],
    "Kiểm toán & Kiểm soát nội bộ": ["kiểm toán", "audit", "kiểm soát nội bộ", "internal control", "ifrs", "vas"],
    "Tín dụng & Ngân hàng": ["tín dụng", "ngân hàng", "thẩm định tín dụng", "banking", "credit", "cho vay", "thanh toán quốc tế"],
    "Đầu tư & Chứng khoán": ["đầu tư", "chứng khoán", "định giá", "investment", "portfolio", "cổ phiếu", "trái phiếu"],

    # 4. Luật / Pháp chế / Hành chính
    "Soạn thảo hợp đồng": ["soạn thảo hợp đồng", "hợp đồng", "contract", "rà soát hợp đồng"],
    "Nghiên cứu văn bản pháp luật": ["văn bản pháp luật", "tra cứu văn bản", "luật", "nghị định", "thông tư", "legal research"],
    "Luật Doanh nghiệp": ["luật doanh nghiệp", "corporate law", "thành lập doanh nghiệp", "giấy phép kinh doanh"],
    "Luật Lao động": ["luật lao động", "labor law", "hợp đồng lao động", "bảo hiểm xã hội", "bhxh", "tranh chấp lao động"],
    "Tư vấn pháp lý": ["tư vấn pháp lý", "pháp chế", "legal advice", "legal officer", "counsel", "tuân thủ", "compliance"],
    "Sở hữu trí tuệ": ["sở hữu trí tuệ", "nhãn hiệu", "bản quyền", "intellectual property", "ip "],
    "Giải quyết tranh chấp & Tranh tụng": ["tranh tụng", "tranh chấp", "tố tụng", "tòa án", "trọng tài", "litigation"],

    # 5. F&B / Nhà hàng - Khách sạn / Pha chế / Dịch vụ
    "Food & Beverage Service (Nghiệp vụ F&B)": ["f&b", "food & beverage", "food and beverage", "nhà hàng", "khách sạn", "hospitality", "phục vụ bàn"],
    "Mixology / Pha chế (Bartender & Barista)": ["mixology", "bartender", "barista", "pha chế", "cocktail", "coffee", "đồ uống"],
    "Cost Control (Kiểm soát chi phí)": ["cost control", "kiểm soát chi phí", "định lượng", "food cost", "beverage cost", "chi phí nguyên vật liệu"],
    "Inventory Management (Quản lý tồn kho)": ["inventory", "tồn kho", "kiểm kê", "quản lý kho", "nhập xuất tồn", "fifo"],
    "Tiêu chuẩn VSATTP (HACCP / ISO)": ["haccp", "vsattp", "vệ sinh an toàn thực phẩm", "food safety", "iso 22000"],
    "Vận hành ca & Quản lý cửa hàng": ["quản lý ca", "shift", "pos", "vận hành cửa hàng", "store operations"],

    # 6. Marketing / Truyền thông / Thương mại điện tử / Thiết kế
    "Digital Marketing": ["digital marketing", "marketing online", "performance marketing", "inbound marketing"],
    "Nghiên cứu thị trường & Insight": ["nghiên cứu thị trường", "market research", "customer insight", "hành vi khách hàng", "phân tích đối thủ"],
    "Content Marketing & Copywriting": ["content", "copywriting", "viết bài", "sáng tạo nội dung", "kịch bản", "storytelling"],
    "SEO / SEM": ["seo", "sem", "google analytics", "search console", "từ khóa", "onpage", "offpage"],
    "Quảng cáo đa kênh (Ads)": ["facebook ads", "google ads", "tiktok ads", "chạy quảng cáo", "media buying", "roas"],
    "Quản trị Mạng xã hội (Social Media)": ["social media", "fanpage", "tiktok", "youtube", "cộng đồng", "seeding", "kol", "koc"],
    "Thương mại điện tử (E-commerce)": ["thương mại điện tử", "e-commerce", "ecommerce", "shopee", "lazada", "tiktok shop", "sàn tmđt"],
    "Thiết kế đồ họa (Graphic Design)": ["photoshop", "illustrator", "indesign", "canva", "thiết kế đồ họa", "graphic design", "banner", "poster"],
    "Thiết kế UI/UX (Figma)": ["ui/ux", "figma", "wireframe", "prototype", "user experience", "thiết kế giao diện"],
    "Dựng phim & Biên tập Video": ["premiere", "after effects", "capcut", "dựng phim", "video editing", "quay dựng"],

    # 7. Kinh doanh / Bán hàng (Sales) / Chăm sóc khách hàng
    "Kỹ năng Bán hàng & Phát triển kinh doanh (Sales)": ["kinh doanh", "bán hàng", "sales", "b2b", "b2c", "telesales", "chốt sale", "doanh số", "business development"],
    "Chăm sóc khách hàng & CRM": ["chăm sóc khách hàng", "customer service", "cskh", "crm", "hubspot", "xử lý khiếu nại", "hậu mãi"],
    "Đàm phán & Thương lượng": ["đàm phán", "thương lượng", "negotiation", "thuyết phục khách hàng"],

    # 8. Nhân sự (HR) / Tuyển dụng / Hành chính
    "Tuyển dụng nhân sự (Talent Acquisition)": ["tuyển dụng nhân sự", "chuyên viên tuyển dụng", "recruitment", "recruiter", "talent acquisition", "headhunt", "phỏng vấn ứng viên", "sàng lọc cv", "tạo nguồn ứng viên"],
    "Tiền lương & Phúc lợi (C&B)": ["c&b", "chấm công", "tính lương", "payroll", "bảo hiểm xã hội", "thuế tncn", "phúc lợi nhân sự"],
    "Đào tạo & Phát triển nhân sự (L&D)": ["đào tạo nội bộ", "l&d", "learning and development", "onboarding", "đánh giá năng lực nhân sự", "khung năng lực"],
    "Hành chính văn phòng": ["hành chính", "văn thư", "lưu trữ", "quản trị văn phòng", "admin", "mua sắm thiết bị"],

    # 9. Logistics / Xuất nhập khẩu / Chuỗi cung ứng
    "Nghiệp vụ Xuất nhập khẩu & Hải quan": ["xuất nhập khẩu", "import", "export", "hải quan", "customs", "ecus", "vnaccs", "incoterms", "l/c"],
    "Quản trị Chuỗi cung ứng & Logistics": ["logistics", "chuỗi cung ứng", "supply chain", "vận tải", "forwarding", "booking", "bill of lading"],
    "Thu mua & Quản lý Nhà cung cấp (Procurement)": ["thu mua", "mua hàng", "purchasing", "procurement", "sourcing", "nhà cung cấp", "vendor"],

    # 10. Kỹ thuật / Cơ khí / Xây dựng / Sản xuất
    "Thiết kế kỹ thuật (AutoCAD / SolidWorks)": ["autocad", "solidworks", "revit", "catia", "bản vẽ kỹ thuật", "cad", "bim"],
    "Quản lý chất lượng sản xuất (ISO / 5S / Kaizen)": ["iso 9001", "5s", "kaizen", "lean", "six sigma", "qa/qc sản xuất", "quản lý sản xuất"],
    "Bóc tách khối lượng & Giám sát thi công": ["bóc tách khối lượng", "dự toán công trình", "giám sát thi công", "xây dựng", "công trường", "m&e"],
    "Tự động hóa & Điện công nghiệp (PLC)": ["plc", "scada", "điện công nghiệp", "tự động hóa", "vi điều khiển", "iot"],

    # 11. Y Dược / Giáo dục
    "Chuyên môn Y Dược & Chăm sóc sức khỏe": ["dược", "y tế", "gpp", "gdp", "gmp", "lâm sàng", "bệnh viện", "nhà thuốc", "chăm sóc sức khỏe"],
    "Kỹ năng Sư phạm & Giảng dạy": ["giảng dạy", "sư phạm", "giáo án", "đào tạo học viên", "teaching", "ielts trainer", "trợ giảng"],

    # 12. Công cụ Văn phòng & Ngoại ngữ
    "Microsoft Office (Word / Excel / PowerPoint)": ["microsoft office", "tin học văn phòng", "ms office", "word", "powerpoint", "mos", "ic3"],
    "Tiếng Anh chuyên ngành / Giao tiếp": ["tiếng anh", "english", "toeic", "ielts", "toefl", "giao tiếp tiếng anh", "tiếng anh thương mại", "tiếng anh pháp lý"],
    "Ngoại ngữ thứ 2 (Trung / Nhật / Hàn)": ["tiếng trung", "hsk", "tiếng nhật", "jlpt", "tiếng hàn", "topik", "tiếng pháp"],
}

# TỪ ĐIỂN KỸ NĂNG MỀM TIẾNG VIỆT & TIẾNG ANH ĐỘC LẬP (TRÁNH LẪN LỘN NGÔN NGỮ)
SOFT_SKILLS_VI = {
    "Giao tiếp & Trình bày": ["giao tiếp", "trình bày", "diễn đạt", "lắng nghe", "ứng xử"],
    "Làm việc nhóm": ["làm việc nhóm", "teamwork", "team work", "phối hợp nhóm", "hợp tác", "collaboration", "team player"],
    "Giải quyết vấn đề": ["giải quyết vấn đề", "problem solving", "xử lý tình huống", "xử lý sự cố"],
    "Tư duy phản biện & Phân tích": ["tư duy phản biện", "critical thinking", "tư duy logic", "analytical thinking", "tư duy phân tích"],
    "Quản lý thời gian & Tiến độ": ["quản lý thời gian", "time management", "lập kế hoạch", "planning", "tổ chức công việc", "sắp xếp công việc", "đa nhiệm"],
    "Kỹ năng Thuyết trình": ["thuyết trình", "presentation", "public speaking"],
    "Đàm phán & Thuyết phục": ["đàm phán", "thương lượng", "negotiation", "thuyết phục"],
    "Lãnh đạo & Quản lý đội nhóm": ["lãnh đạo", "leadership", "quản lý nhóm", "team lead", "mentor", "dẫn dắt", "điều phối"],
    "Thích ứng & Học hỏi nhanh": ["chịu áp lực", "áp lực cao", "thích nghi", "adaptability", "linh hoạt", "ham học hỏi", "tự học", "chủ động"],
    "Tư duy sáng tạo": ["sáng tạo", "creativity", "creative", "ý tưởng mới", "đổi mới"],
    "Chăm sóc khách hàng": ["chăm sóc khách hàng", "customer service", "tư vấn khách hàng", "dịch vụ khách hàng", "tận tâm"]
}

SOFT_SKILLS_EN = {
    "Communication & Presentation": ["communication", "presentation", "public speaking", "listening", "speaking"],
    "Teamwork & Collaboration": ["teamwork", "team work", "collaboration", "team player", "cooperation"],
    "Problem Solving": ["problem solving", "troubleshooting", "incident resolution"],
    "Critical Thinking & Analysis": ["critical thinking", "analytical thinking", "analytical skills", "logical reasoning"],
    "Time Management & Planning": ["time management", "planning", "organization", "multitasking", "prioritization"],
    "Negotiation & Persuasion": ["negotiation", "persuasion", "deal closing"],
    "Leadership & Mentoring": ["leadership", "mentoring", "team lead", "supervision"],
    "Adaptability & Agility": ["adaptability", "agility", "fast learner", "flexibility", "working under pressure"],
    "Creative Thinking": ["creativity", "creative thinking", "innovation"],
    "Customer Service": ["customer service", "client relationship", "customer care"]
}

# Giữ tương thích ngược với catalog cũ
SOFT_SKILLS_CATALOG = {**SOFT_SKILLS_VI}


def detect_language(text: str) -> str:
    """Xác định ngôn ngữ chính của văn bản: Tiếng Việt ('vi') hoặc Tiếng Anh ('en')."""
    if not text:
        return 'vi'
    vn_chars = set("àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ"
                   "ÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ")
    vn_char_count = sum(1 for c in text if c in vn_chars)
    words = [w.strip().lower() for w in re.split(r'\s+', text) if w.strip()]
    vn_words = {"và", "của", "các", "có", "trong", "được", "người", "kỹ", "năng", "kinh", "nghiệm", "học", "dự", "án", "với", "cho", "là", "tại", "năm", "tháng"}
    vn_word_count = sum(1 for w in words if w in vn_words)
    if vn_char_count >= 8 or vn_word_count >= 4:
        return 'vi'
    return 'en'


def _kw_in_text(kw: str, text_lower: str) -> bool:
    """Kiểm tra từ khóa xuất hiện độc lập (word boundary) để tránh khớp nhầm từ con (VD: 'git' trong 'digital', 'api' trong 'capital')."""
    kw_clean = kw.strip().lower()
    if not kw_clean or kw_clean not in text_lower:
        return False
    pattern = r'(?<![a-zA-Z0-9_À-ỹ])' + re.escape(kw_clean) + r'(?![a-zA-Z0-9_À-ỹ])'
    return bool(re.search(pattern, text_lower))


def extract_soft_skills_from_text(text: str, max_skills: int = 10, lang: str = "vi") -> list[str]:
    """Tìm các kỹ năng mềm mà ứng viên có liệt kê trên CV theo đúng ngôn ngữ đã phát hiện (vi / en)."""
    if not text or not text.strip():
        return []
    text_lower = " " + text.lower() + " "
    catalog = SOFT_SKILLS_EN if lang == "en" else SOFT_SKILLS_VI
    found_soft = []
    for skill_name, keywords in catalog.items():
        for kw in keywords:
            if _kw_in_text(kw, text_lower):
                if skill_name not in found_soft:
                    found_soft.append(skill_name)
                break
    return found_soft[:max_skills]


def extract_skills_universal_from_text(text: str, max_skills: int = 12, include_soft: bool = True, lang: str = "vi") -> list[str]:
    """
    Trích xuất kỹ năng chuyên ngành từ văn bản CV hoặc JD.
    Nếu không tìm thấy kỹ năng chuyên ngành (hoặc include_soft=True), tìm tiếp các kỹ năng mềm được liệt kê trong văn bản.
    """
    if not text or not text.strip():
        return []
    text_lower = " " + text.lower() + " "
    found = []

    for skill_name, keywords in UNIVERSAL_SKILL_CATALOG.items():
        for kw in keywords:
            if _kw_in_text(kw, text_lower):
                if skill_name not in found:
                    found.append(skill_name)
                break

    # Bóc tách bổ sung các dòng bullet / yêu cầu chuyên biệt nếu văn bản thuộc ngành đặc thù ít gặp
    bullet_patterns = re.findall(
        r'(?:^|\n)\s*(?:[-•+*]|\d+[\.\)])\s*([^\n\r]{4,65})',
        text
    )
    trigger_Regex = re.compile(
        r'(?:thành thạo|sử dụng tốt|có kinh nghiệm về|hiểu biết về|nắm vững|kỹ năng|chuyên môn về|biết dùng|yêu cầu:?|proficient in|experience with|knowledge of)\s+([^,.;\n\r]{3,45})',
        re.IGNORECASE
    )
    for m in trigger_Regex.finditer(text):
        phrase = m.group(1).strip(" -•+*:.,;()[]{}\"'")
        if 3 <= len(phrase) <= 42 and not any(phrase.lower() in f.lower() or f.lower() in phrase.lower() for f in found):
            found.append(phrase[:1].upper() + phrase[1:])

    # Nếu không có kỹ năng chuyên ngành (hoặc cần bổ sung kỹ năng mềm có liệt kê trên CV/JD)
    if include_soft or len(found) == 0:
        soft_found = extract_soft_skills_from_text(text, max_skills=max_skills, lang=lang)
        for sf in soft_found:
            if not any(sf.lower() in f.lower() or f.lower() in sf.lower() for f in found):
                found.append(sf)

    if len(found) < 4:
        for bp in bullet_patterns:
            clean_bp = re.sub(r'^(yêu cầu|có|biết|ưu tiên|kỹ năng)\s*:?\s*', '', bp.strip(), flags=re.IGNORECASE).strip(" .,:;-")
            if 3 <= len(clean_bp) <= 40 and not any(clean_bp.lower() in f.lower() or f.lower() in clean_bp.lower() for f in found):
                found.append(clean_bp[:1].upper() + clean_bp[1:])
            if len(found) >= 8:
                break

    return found[:max_skills]


def skills_are_matching(cv_skill: str, jd_skill: str) -> bool:
    """So khớp thông minh giữa kỹ năng trong CV và kỹ năng yêu cầu của JD (hỗ trợ từ đồng nghĩa & từ khóa con)."""
    c = cv_skill.lower().strip()
    j = jd_skill.lower().strip()
    if not c or not j:
        return False
    if c in j or j in c:
        return True

    combined_catalogs = list(UNIVERSAL_SKILL_CATALOG.items()) + list(SOFT_SKILLS_CATALOG.items())
    for skill_label, kws in combined_catalogs:
        lbl_low = skill_label.lower()
        c_hit = (c == lbl_low) or any(_kw_in_text(kw, c) for kw in kws if len(kw.strip()) >= 2)
        if not c_hit:
            continue
        j_hit = (j == lbl_low) or any(_kw_in_text(kw, j) for kw in kws if len(kw.strip()) >= 2)
        if j_hit:
            return True

    stop_tokens = {"kỹ", "năng", "cơ", "bản", "nâng", "cao", "chuyên", "môn", "về", "và", "hoặc", "quản", "lý", "phân", "tích", "nghiệp", "vụ"}
    c_tokens = {t for t in re.split(r'[\s/,\-\(\)]+', c) if len(t) >= 3 and t not in stop_tokens}
    j_tokens = {t for t in re.split(r'[\s/,\-\(\)]+', j) if len(t) >= 3 and t not in stop_tokens}
    if c_tokens and j_tokens and (c_tokens & j_tokens):
        return True
    return False


# ==========================================
# HỆ THỐNG KẾT NỐI OLLAMA TRỰC TIẾP (KHÔNG DÙNG FALLBACK)
# ==========================================
_WORKING_OLLAMA_HOST = None

def _probe_ollama_host(host: str, target_model: str = "qwen3.5:4b"):
    try:
        req = urllib.request.Request(
            f"{host.rstrip('/')}/api/tags",
            headers={"Host": "localhost:11434"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                has_model = any(target_model in m for m in models)
                return True, has_model
    except Exception:
        pass
    return False, False


def _smart_ollama_chat(*args, **kwargs):
    global _WORKING_OLLAMA_HOST
    # Tắt chế độ suy nghĩ ngầm (<think>) của Qwen 3.5 để tốc độ trả lời nhanh và trả thẳng JSON
    kwargs.setdefault("think", False)
    target_model = kwargs.get("model", "qwen3.5:4b")

    in_docker = os.path.exists("/.dockerenv")
    raw_hosts = []
    if _WORKING_OLLAMA_HOST:
        raw_hosts.append(_WORKING_OLLAMA_HOST)
    env_host = os.getenv("OLLAMA_HOST", "").strip()
    if env_host:
        raw_hosts.append(env_host)
    raw_hosts.append("http://127.0.0.1:11434")
    if in_docker:
        raw_hosts.extend(["http://host.docker.internal:11434", "http://ollama:11434"])

    candidates = []
    for h in raw_hosts:
        if h and h not in candidates:
            candidates.append(h)

    # Ưu tiên dịch vụ Ollama ĐÃ CÓ SẴN model; chỉ tải model khi không nơi nào có sẵn
    alive_with_model, alive_without_model = [], []
    for host in candidates:
        is_alive, has_model = _probe_ollama_host(host, target_model)
        if is_alive:
            (alive_with_model if has_model else alive_without_model).append(host)

    # Khi phải tải model, ưu tiên container Ollama nội bộ của Docker Compose
    alive_without_model.sort(key=lambda h: 0 if "ollama:" in h else 1)

    last_err = None
    for host, has_model in [(h, True) for h in alive_with_model] + [(h, False) for h in alive_without_model]:
        try:
            client = ollama.Client(host=host, headers={"Host": "localhost:11434"}, timeout=300.0)
            if not has_model:
                print(f"[Ollama] Đang tải model {target_model} tại {host}...")
                client.pull(target_model)
            res = client.chat(*args, **kwargs)
            _WORKING_OLLAMA_HOST = host
            return res
        except Exception as e:
            print(f"[Ollama] Lỗi khi gọi model tại {host}: {e}")
            last_err = e
            if _WORKING_OLLAMA_HOST == host:
                _WORKING_OLLAMA_HOST = None

    if last_err:
        raise last_err
    raise RuntimeError(f"Không thể kết nối tới dịch vụ Ollama ({', '.join(candidates)}). Vui lòng kiểm tra Ollama đã chạy và có model {target_model}.")

ollama.chat = _smart_ollama_chat


# ==========================================
# PHẦN 2: THIẾT KẾ DATABASE (Chuẩn theo đề án TQL)
# ==========================================
class InterviewRequest(BaseModel):
    profile_id: str | None = None
    persona: str | None = "tech_lead"
    level: str | None = "mid"
    language: str | None = "vi"
    analysis_context: dict | None = None
    random_nonce: int | None = None

class AnswerSubmitRequest(BaseModel):
    profile_id: int | str = 1
    question_text: str
    student_answer: str
    language: str | None = "vi"
    job_id: int | None = None
    question_category: str | None = None

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    skills_json = Column(Text)
    interests_json = Column(Text)
    experience_text = Column(Text)
    free_time_json = Column(Text)

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    requirements_json = Column(Text)

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    total_score = Column(Float)
    gaps_json = Column(Text)
    reasons_json = Column(Text)

class StudyTask(Base):
    __tablename__ = "study_tasks"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    title = Column(String)
    duration_minutes = Column(Integer)
    scheduled_day = Column(String)
    unlock_time = Column(String)    # Thời điểm mở khóa (ISO 8601 theo giờ VN)
    deadline_time = Column(String)  # Thời điểm hết hạn (ISO 8601 theo giờ VN)
    status = Column(String, default="locked") # locked, active, expired, completed, unscheduled

class TaskCompleteInput(BaseModel):
    task_id: int

class StreakAndReport(Base):
    __tablename__ = "streaks_and_reports"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))

    # 1. Quản lý Mầm cây & XP
    seed_stage = Column(String, default="Hạt giống")
    current_xp = Column(Integer, default=0)
    weekly_xp = Column(Integer, default=0)

    # 2. Quản lý Chuỗi ngày (Streak) & Phiếu nghỉ phép (1 lần/tuần)
    current_streak = Column(Integer, default=0)
    last_study_date = Column(String, default="")
    last_watered_date = Column(String, default="")
    last_leave_date = Column(String, default="")
    recovery_mode = Column(Boolean, default=False)

    # 3. Báo cáo Giờ học & Lộ trình (Phút)
    total_roadmap_minutes = Column(Integer, default=0)
    completed_roadmap_minutes = Column(Integer, default=0)

    # 4. Chỉ số Kỷ luật (Tính theo số Task)
    planned_tasks_weekly = Column(Integer, default=0)
    completed_tasks_weekly = Column(Integer, default=0)
    discipline_score = Column(Float, default=0.0)

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    is_match = Column(Boolean)

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    questions_json = Column(Text)
    student_answer_text = Column(Text)
    evaluation_json = Column(Text)

try:
    from sqlalchemy import text as sa_text
    Base.metadata.create_all(bind=engine)
    with engine.begin() as _conn:
        _conn.execute(sa_text("ALTER TABLE streaks_and_reports ADD COLUMN IF NOT EXISTS last_leave_date VARCHAR DEFAULT ''"))
        # Đồng bộ bộ đếm ID tự tăng (Sequence) của bảng profiles để tránh lỗi trùng lặp Primary Key với hồ sơ mẫu (9991..9999)
        _conn.execute(sa_text("""
            SELECT setval(
                pg_get_serial_sequence('profiles', 'id'),
                COALESCE((SELECT MAX(id) FROM profiles WHERE id < 9000), 1),
                (SELECT COUNT(*) > 0 FROM profiles WHERE id < 9000)
            )
        """))
except Exception as _db_init_err:
    print(f"Lưu ý: Chờ kết nối Database khi khởi chạy ({_db_init_err})")

# ==========================================
# PHẦN 3: PYDANTIC SCHEMAS & HÀM TIỆN ÍCH DB
# ==========================================
class JobCreateAI(BaseModel):
    title: str
    description: str

class CVInput(BaseModel):
    name: str
    email: str
    cv_text: str
    free_time_json: str

class StarAnswerInput(BaseModel):
    student_answer: str

class FeedbackInput(BaseModel):
    profile_id: int | str
    job_id: int | None = None
    is_match: bool

class ScheduleItem(BaseModel):
    id: int
    exactDate: str
    dayOfWeek: str
    timeStart: str
    timeEnd: str

class StudyPlanRequest(BaseModel):
    profile_id: str
    role_id: str | None = "1"
    schedules: List[ScheduleItem] = []
    gaps: List[str] = []
    jd_text: str | None = ""
    target_role: str | None = ""

class UpdateScheduleRequest(BaseModel):
    profile_id: str | int
    schedules: List[ScheduleItem]


def resolve_profile_id(raw_profile_id: int | str | None) -> int:
    """Chuyển đổi mọi dạng profile_id (số hoặc chuỗi như 'khoi', 'linh', 'duc') về ID số nguyên hợp lệ."""
    if raw_profile_id is None:
        return 9999
    s = str(raw_profile_id).strip()
    if s.isdigit() and int(s) > 0:
        return int(s)
    sample_map = {"khoi": 9991, "linh": 9992, "duc": 9993}
    return sample_map.get(s.lower(), 9999)


def ensure_profile_and_streak(db: Session, raw_profile_id: int | str | None) -> tuple[Profile, StreakAndReport]:
    """
    Đảm bảo luôn tồn tại bản ghi Profile và StreakAndReport (Chậu cây) trong Database.
    """
    pid = resolve_profile_id(raw_profile_id)
    profile = db.query(Profile).filter(Profile.id == pid).first()
    if not profile:
        default_email = f"user_{pid}@careercoach.local"
        existing_by_email = db.query(Profile).filter(Profile.email == default_email).first()
        if existing_by_email:
            profile = existing_by_email
            pid = profile.id
        else:
            profile = Profile(
                id=pid,
                name=f"Học viên #{pid}",
                email=default_email,
                password=hashlib.sha256("123456".encode()).hexdigest(),
                skills_json="{}",
                interests_json="[]",
                experience_text="",
                free_time_json="[]"
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

    record = db.query(StreakAndReport).filter(StreakAndReport.profile_id == profile.id).first()
    if not record:
        record = StreakAndReport(profile_id=profile.id)
        db.add(record)
        db.commit()
        db.refresh(record)

    return profile, record


def _is_same_iso_week(date_str_1: str, date_str_2: str) -> bool:
    """Kiểm tra 2 chuỗi ngày YYYY-MM-DD có nằm trong cùng 1 tuần lễ (Thứ 2 -> Chủ Nhật) hay không."""
    if not date_str_1 or not date_str_2:
        return False
    try:
        d1 = datetime.strptime(date_str_1.strip(), "%Y-%m-%d").date()
        d2 = datetime.strptime(date_str_2.strip(), "%Y-%m-%d").date()
        return d1.isocalendar()[:2] == d2.isocalendar()[:2]
    except Exception:
        return False


def _clean_spaced_hyphens(value):
    """Hạn chế tối đa ký tự gạch nối (' - ', ' – ', ' — ') trong văn bản được AI sinh ra."""
    if isinstance(value, str):
        cleaned = re.sub(r'(?:^|\n)\s*-\s+', lambda m: '\n• ' if '\n' in m.group(0) else '• ', value)
        cleaned = re.sub(r'[ \t]+[-–—][ \t]+', ', ', cleaned)
        return cleaned.strip()
    elif isinstance(value, list):
        return [_clean_spaced_hyphens(item) for item in value]
    elif isinstance(value, dict):
        return {k: _clean_spaced_hyphens(v) for k, v in value.items()}
    return value


def compute_roadmap_and_plant_metrics(db: Session, profile_id: int, record: StreakAndReport) -> dict:
    """
    Tính toán quá trình nuôi cây tương ứng với lộ trình đã tạo trong bao nhiêu ngày đó
    + thêm XP tưới cây với số ngày của lộ trình học:
      Target Plant XP = (Tổng số bài học * 50 XP) + (Số ngày của lộ trình * 25 XP tưới cây)
    """
    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == profile_id).order_by(StudyTask.id.asc()).all()
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")
    task_progress_percent = round((completed_tasks / total_tasks) * 100.0, 1) if total_tasks > 0 else 0.0

    scheduled_days_set = {
        t.scheduled_day.strip()
        for t in all_tasks
        if t.scheduled_day and t.scheduled_day.strip() and t.scheduled_day.strip() != "Chờ xếp lịch"
    }
    roadmap_days = max(1, len(scheduled_days_set)) if total_tasks > 0 else 0

    if total_tasks > 0:
        target_plant_xp = (total_tasks * 50) + (roadmap_days * 25)
    else:
        target_plant_xp = 0

    if total_tasks == 0 or target_plant_xp <= 0 or record.current_xp <= 0:
        plant_progress_percent = 0.0
    else:
        plant_progress_percent = min(100.0, round((record.current_xp / target_plant_xp) * 100.0, 1))

    if plant_progress_percent <= 0:
        current_stage = "Hạt giống"
    elif plant_progress_percent < 25:
        current_stage = "Nảy mầm"
    elif plant_progress_percent < 50:
        current_stage = "Phát triển thân"
    elif plant_progress_percent < 75:
        current_stage = "Phân cành"
    elif plant_progress_percent < 100:
        current_stage = "Ra lá"
    else:
        current_stage = "Kết trái"

    record.seed_stage = current_stage

    total_mins = sum(t.duration_minutes for t in all_tasks)
    completed_mins = sum(t.duration_minutes for t in all_tasks if t.status == "completed")
    record.total_roadmap_minutes = total_mins
    record.completed_roadmap_minutes = completed_mins

    record.completed_tasks_weekly = completed_tasks
    planned = record.planned_tasks_weekly if record.planned_tasks_weekly > 0 else total_tasks
    if planned > 0 and total_tasks > 0:
        record.discipline_score = min(100.0, round((completed_tasks / planned) * 100.0, 1))
    else:
        record.discipline_score = 0.0

    base_xp = target_plant_xp if target_plant_xp > 0 else 300
    stage_thresholds = [
        max(25, round(base_xp * 0.15)),
        max(50, round(base_xp * 0.30)),
        max(75, round(base_xp * 0.50)),
        max(100, round(base_xp * 0.75)),
        max(125, round(base_xp * 0.90)),
        max(150, base_xp)
    ]

    return {
        "all_tasks": all_tasks,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "progress_percent": task_progress_percent,
        "roadmap_days": roadmap_days,
        "target_plant_xp": target_plant_xp,
        "plant_progress_percent": plant_progress_percent,
        "seed_stage": current_stage,
        "stage_thresholds": stage_thresholds,
        "total_roadmap_minutes": total_mins,
        "completed_roadmap_minutes": completed_mins,
        "discipline_score": record.discipline_score
    }


def _slice_tasks_into_schedules(target_pid: int, raw_tasks: list[dict], schedules: list[ScheduleItem]) -> list[StudyTask]:
    """Băm nhỏ danh sách bài học vào các khung giờ rảnh theo đúng thứ tự thời gian."""
    sorted_schedules = list(schedules) if schedules else []
    sorted_schedules.sort(key=lambda x: datetime.strptime(f"{x.exactDate} {x.timeStart}", "%d/%m/%Y %H:%M"))

    final_db_tasks = []
    current_schedule_idx = 0

    def get_slot_info(idx):
        if idx >= len(sorted_schedules):
            return None, None, 0
        slot = sorted_schedules[idx]
        start = datetime.strptime(f"{slot.exactDate} {slot.timeStart}", "%d/%m/%Y %H:%M")
        end = datetime.strptime(f"{slot.exactDate} {slot.timeEnd}", "%d/%m/%Y %H:%M")
        if end <= start:
            end = start + timedelta(minutes=60)
        return start, end, max(15, int((end - start).total_seconds() / 60))

    current_start, current_end, slot_remaining = get_slot_info(0)

    for task in raw_tasks:
        task_title = task.get("title", "Bài học chuyên môn")
        try:
            task_remaining = max(15, int(task.get("duration_minutes", 45) or 45))
        except Exception:
            task_remaining = 45
        part = 1

        while task_remaining > 0:
            while slot_remaining <= 0 and current_schedule_idx < len(sorted_schedules):
                current_schedule_idx += 1
                current_start, current_end, slot_remaining = get_slot_info(current_schedule_idx)

            if current_schedule_idx < len(sorted_schedules):
                chunk_duration = min(task_remaining, slot_remaining)
                chunk_end_time = current_start + timedelta(minutes=chunk_duration)

                needs_split = (task_remaining > slot_remaining) or (part > 1)
                final_title = f"{task_title} (Phần {part})" if needs_split else task_title

                final_db_tasks.append(StudyTask(
                    profile_id=target_pid,
                    title=final_title,
                    duration_minutes=chunk_duration,
                    scheduled_day=current_start.strftime("%d/%m/%Y"),
                    unlock_time=current_start.isoformat(),
                    deadline_time=chunk_end_time.isoformat(),
                    status="locked"
                ))

                task_remaining -= chunk_duration
                slot_remaining -= chunk_duration
                current_start = chunk_end_time
                part += 1
            else:
                needs_split = part > 1
                final_title = f"{task_title} (Phần {part})" if needs_split else task_title

                final_db_tasks.append(StudyTask(
                    profile_id=target_pid,
                    title=final_title,
                    duration_minutes=task_remaining,
                    scheduled_day="Chờ xếp lịch",
                    unlock_time="",
                    deadline_time="",
                    status="unscheduled"
                ))
                task_remaining = 0

    return final_db_tasks


# ==========================================
# PHẦN 4: CÁC API ENDPOINTS & BẬT CORS
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Career Coach - Hoàn thiện chuẩn Đề án TQL (Qwen 3.5:4b)!"}

@app.post("/jobs/extract-advanced/")
def create_job_with_advanced_ai(job: JobCreateAI, db: Session = Depends(get_db)):
    prompt_text = f"""
    Đọc Mô tả công việc (JD) sau và trích xuất các kỹ năng chuyên môn (Hard skills) và kỹ năng mềm (Soft skills).
    JD này có thể thuộc bất kỳ ngành nghề nào (CNTT, Kinh tế, Tài chính, Kế toán, Luật, F&B, Marketing, Nhân sự, Kỹ thuật...).
    CHỈ trả về mảng JSON theo cấu trúc sau: 
    [{{"skill": "Tên kỹ năng", "evidence": "Trích dẫn bằng chứng từ JD"}}]
    JD: {job.description}
    """
    response = ollama.chat(
        model='qwen3.5:4b',
        messages=[
            {'role': 'system', 'content': 'You are a JSON API. Output only valid JSON.'},
            {'role': 'user', 'content': prompt_text}
        ],
        format='json'
    )
    ai_extracted_skills = response['message']['content']

    db_job = Job(title=job.title, description=job.description, requirements_json=ai_extracted_skills)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@app.post("/profiles/extract-cv/")
def create_profile_from_cv(cv_input: CVInput, db: Session = Depends(get_db)):
    raw_text = (cv_input.cv_text or "").strip()
    words = raw_text.split()
    if len(words) < 15:
        raise HTTPException(
            status_code=400,
            detail="Nội dung file quá ngắn hoặc không đọc được chữ (file ảnh quét / scan / không có dữ liệu văn bản). Vui lòng tải lên file CV định dạng PDF hợp lệ!"
        )

    cv_lang = detect_language(raw_text)
    cv_text_short = raw_text[:2500]

    if cv_lang == "en":
        prompt_text = f"""Extract candidate info and skills from the English CV text below.
CRITICAL RULES:
1. VALIDATION: If the text below is a junk file, exam paper, invoice, novel, or NOT a valid CV/Resume, return ONLY: {{"is_cv": false}}
2. IF IT IS A VALID CV, return "is_cv": true and extract the candidate data.
3. LANGUAGE RULE: The CV is in English. Extract all skills, soft skills, and experience summary in ENGLISH.
Output ONLY a valid JSON object without markdown or explanation.

CV TEXT:
{cv_text_short}

REQUIRED JSON FORMAT:
{{
    "is_cv": true,
    "name": "Candidate Name",
    "email": "email@example.com",
    "skills": {{"Skill 1": 4, "Skill 2": 5}},
    "soft_skills": ["Soft Skill 1", "Soft Skill 2"],
    "experience": "Brief summary of work experience and projects in English"
}}
"""
    else:
        prompt_text = f"""Phân tích văn bản dưới đây và trích xuất thông tin ứng viên sang định dạng JSON.
QUY TẮC TỐI THƯỢNG:
1. KIỂM TRA HỢP LỆ: Nếu văn bản dưới đây là tài liệu rác, đề thi, hóa đơn, truyện, hoặc KHÔNG PHẢI là Hồ sơ xin việc (CV/Resume), hãy trả về duy nhất: {{"is_cv": false}}
2. NẾU LÀ CV HỢP LỆ, trả về "is_cv": true và trích xuất dữ liệu.
3. ĐỒNG NHẤT NGÔN NGỮ KỸ NĂNG:
   - Các kỹ năng mềm, kỹ năng chung BẮT BUỘC dịch sang Tiếng Việt (VD: "Communication" -> "Giao tiếp", "Teamwork" -> "Làm việc nhóm", "Problem Solving" -> "Giải quyết vấn đề").
   - Chỉ giữ lại Tiếng Anh cho tên riêng của công nghệ, phần mềm, chứng chỉ quốc tế (VD: Python, ReactJS, Docker, Excel, AutoCAD, IELTS).
   - TUYỆT ĐỐI KHÔNG viết song ngữ nửa Anh nửa Việt (ví dụ: không viết 'Giao tiếp (Communication)' hay 'Teamwork làm việc nhóm').
4. Nếu CV có liệt kê kỹ năng mềm (giao tiếp, làm việc nhóm, giải quyết vấn đề, quản lý thời gian...), hãy trích xuất chúng vào "soft_skills" bằng Tiếng Việt.

VĂN BẢN CẦN PHÂN TÍCH:
{cv_text_short}

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (KHÔNG KÈM MARKDOWN):
{{
    "is_cv": true,
    "name": "Họ và tên ứng viên",
    "email": "email@example.com",
    "skills": {{"Tên kỹ năng 1": 4, "Tên kỹ năng 2": 5}},
    "soft_skills": ["Kỹ năng mềm 1", "Kỹ năng mềm 2"],
    "experience": "Tóm tắt kinh nghiệm bằng Tiếng Việt"
}}
"""

    response = ollama.chat(
        model='qwen3.5:4b',
        format='json',
        messages=[{'role': 'user', 'content': prompt_text}],
        options={'temperature': 0.1}
    )

    content = ""
    if hasattr(response, 'message') and response.message:
        content = getattr(response.message, 'content', '')
    elif isinstance(response, dict):
        content = response.get('message', {}).get('content', '')

    content = content.strip()
    print(f"--- CÂU TRẢ LỜI GỐC CỦA AI (CV - {cv_lang.upper()}) ---:\n{content}\n-----------------------------")

    json_match = re.search(r'(\{[\s\S]*\})', content)
    cleaned = json_match.group(1) if json_match else content
    ai_data = json.loads(cleaned.strip()) if cleaned else {}

    # BẮT LỖI NẾU AI PHÁT HIỆN ĐÂY LÀ FILE RÁC / KHÔNG PHẢI CV
    if ai_data.get("is_cv") is False:
        raise HTTPException(status_code=400, detail="File PDF không hợp lệ hoặc không phải là CV/Resume!")

    ai_name = str(ai_data.get("name", "")).strip()
    if not ai_name or ai_name in ("Candidate Name", "Họ và tên ứng viên"):
        lines = [ln.strip() for ln in cv_input.cv_text.splitlines() if ln.strip() and 2 < len(ln.strip()) < 55]
        ai_name = lines[0] if lines else cv_input.name

    ai_email = str(ai_data.get("email", "")).strip()
    if not ai_email or "@" not in ai_email or ai_email == "email@example.com":
        email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', cv_input.cv_text)
        ai_email = email_m.group(0) if email_m else cv_input.email

    raw_skills = ai_data.get("skills", {})
    final_skills = {}
    if isinstance(raw_skills, list):
        for s in raw_skills:
            if s:
                final_skills[str(s).strip()] = 4
    elif isinstance(raw_skills, dict):
        for k, v in raw_skills.items():
            if k:
                try:
                    final_skills[str(k).strip()] = max(1, min(5, int(float(v))))
                except Exception:
                    final_skills[str(k).strip()] = 4

    # Phân tách kỹ năng chuyên ngành và kỹ năng mềm theo đúng ngôn ngữ
    catalog_to_check = SOFT_SKILLS_EN if cv_lang == "en" else SOFT_SKILLS_VI
    soft_catalog_labels = {lbl.lower() for lbl in catalog_to_check.keys()}
    universal_detected = extract_skills_universal_from_text(raw_text, max_skills=10, include_soft=False, lang=cv_lang)
    domain_detected = [sk for sk in universal_detected if sk.lower() not in soft_catalog_labels]

    for sk in domain_detected:
        if not any(skills_are_matching(sk, existing_k) for existing_k in final_skills.keys()):
            final_skills[sk] = 4
        if len(final_skills) >= 12:
            break

    has_specialized_skills = any(k.lower() not in soft_catalog_labels for k in final_skills.keys())

    # Nếu CV không có kỹ năng chuyên ngành (hoặc số kỹ năng còn ít), quét toàn bộ Kỹ năng mềm người dùng liệt kê trên CV
    if not has_specialized_skills or len(final_skills) < 5:
        ai_soft_list = ai_data.get("soft_skills", [])
        if isinstance(ai_soft_list, list):
            for s_sk in ai_soft_list:
                if s_sk and str(s_sk).strip():
                    s_name = str(s_sk).strip()
                    if not any(skills_are_matching(s_name, existing_k) for existing_k in final_skills.keys()):
                        final_skills[s_name] = 4

        soft_detected = extract_soft_skills_from_text(raw_text, max_skills=10, lang=cv_lang)
        for s_sk in soft_detected:
            if not any(skills_are_matching(s_sk, existing_k) for existing_k in final_skills.keys()):
                final_skills[s_sk] = 4
            if len(final_skills) >= 12:
                break

    # Làm sạch tên kỹ năng để đảm bảo chuẩn xác về ngôn ngữ, không bị dính song ngữ lẫn lộn
    en_to_vi_soft_map = {
        "communication": "Giao tiếp",
        "communication skills": "Kỹ năng giao tiếp",
        "teamwork": "Làm việc nhóm",
        "team work": "Làm việc nhóm",
        "collaboration": "Làm việc nhóm",
        "problem solving": "Giải quyết vấn đề",
        "problem-solving": "Giải quyết vấn đề",
        "time management": "Quản lý thời gian",
        "critical thinking": "Tư duy phản biện",
        "analytical thinking": "Tư duy phân tích",
        "presentation": "Kỹ năng thuyết trình",
        "public speaking": "Kỹ năng thuyết trình",
        "leadership": "Kỹ năng lãnh đạo",
        "negotiation": "Kỹ năng đàm phán",
        "customer service": "Chăm sóc khách hàng",
        "adaptability": "Khả năng thích ứng",
        "creativity": "Tư duy sáng tạo"
    }
    clean_skills = {}
    for k, v in final_skills.items():
        k_str = str(k).strip()
        if cv_lang == "vi":
            # Trường hợp "Communication (Giao tiếp)" -> lấy phần Tiếng Việt trong ngoặc
            m_vi_paren = re.match(r'^[a-zA-Z\s/&\-]+\(([^)]*[À-ỹ][^)]*)\)$', k_str)
            if m_vi_paren:
                k_str = m_vi_paren.group(1).strip()
            else:
                # Trường hợp "Giao tiếp (Communication)" -> bỏ phần Tiếng Anh trong ngoặc
                k_str = re.sub(r'\s*\([a-zA-Z\s/&\.\-]+\)$', '', k_str).strip()
            mapped_vi = en_to_vi_soft_map.get(k_str.lower())
            if mapped_vi:
                k_str = mapped_vi
        if k_str:
            clean_skills[k_str] = v
    final_skills = clean_skills

    # KIỂM TRA FILE RÁC: Báo lỗi ngay nếu không tìm thấy kỹ năng chuyên môn hay kỹ năng mềm nào
    if len(final_skills) == 0:
        raise HTTPException(
            status_code=400,
            detail="File tải lên không hợp lệ hoặc là file rác (không tìm thấy bất kỳ kỹ năng chuyên môn hay kỹ năng mềm nào trong nội dung). Vui lòng kiểm tra lại file CV của bạn!"
        )

    ai_exp = _clean_spaced_hyphens(str(ai_data.get("experience", "")).strip())
    if not ai_exp or ai_exp in ("Chưa có dữ liệu", "Brief summary of work experience and projects in English"):
        ai_exp = _clean_spaced_hyphens(raw_text[:800].strip())

    existing_profile = db.query(Profile).filter(Profile.email == ai_email).first()
    if existing_profile:
        existing_profile.name = ai_name
        existing_profile.skills_json = json.dumps(final_skills, ensure_ascii=False)
        existing_profile.interests_json = json.dumps(ai_data.get("interests", []), ensure_ascii=False)
        existing_profile.experience_text = ai_exp
        db.commit()
        db.refresh(existing_profile)
        db_profile = existing_profile
    else:
        db_profile = Profile(
            name=ai_name,
            email=ai_email,
            skills_json=json.dumps(final_skills, ensure_ascii=False),
            interests_json=json.dumps(ai_data.get("interests", []), ensure_ascii=False),
            experience_text=ai_exp,
            free_time_json=cv_input.free_time_json
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

    # Tự động khởi tạo bản ghi Chậu cây (StreakAndReport) cho hồ sơ CV vừa tải lên
    ensure_profile_and_streak(db, db_profile.id)

    return db_profile


@app.post("/analyses/match/{profile_id}/{role_id}")
async def analyze_skill_match(profile_id: str, role_id: str, request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}

    is_sample_mode = not str(profile_id).isdigit()

    req_skills = body.get("skills")
    req_interests = body.get("interests")
    req_exp = body.get("experience")

    raw_skills = req_skills if req_skills else {}
    raw_interests = req_interests if req_interests else []
    exp_text = req_exp if req_exp is not None else ""

    if not is_sample_mode:
        profile = db.query(Profile).filter(Profile.id == int(profile_id)).first()
        if profile:
            if not req_skills:
                try:
                    raw_skills = json.loads(profile.skills_json) if profile.skills_json else {}
                except Exception:
                    raw_skills = {}
            if not req_interests:
                try:
                    raw_interests = json.loads(profile.interests_json) if profile.interests_json else []
                except Exception:
                    raw_interests = []
            if not req_exp:
                exp_text = profile.experience_text or ""

    sv_skills = {}
    if isinstance(raw_skills, dict):
        for k, v in raw_skills.items():
            try:
                sv_skills[str(k).strip()] = float(v)
            except Exception:
                sv_skills[str(k).strip()] = 3.5
    elif isinstance(raw_skills, list):
        for item in raw_skills:
            if isinstance(item, dict):
                name = item.get("name") or item.get("skill") or item.get("title") or item.get("topic")
                level = item.get("level") or item.get("score") or 4.0
                if name:
                    sv_skills[str(name).strip()] = float(level)
            elif isinstance(item, str):
                sv_skills[item.strip()] = 4.0

    sv_interests = raw_interests if isinstance(raw_interests, (list, dict)) else []

    raw_jd_skills = body.get("jd_skills", [])
    jd_text = body.get("jd_text", "").strip()

    # =========================================================
    # TRÍCH XUẤT KỸ NĂNG TỪ JD DÁN TỰ DO (HỖ TRỢ TẤT CẢ CÁC NGÀNH)
    # =========================================================
    if (not raw_jd_skills or len(raw_jd_skills) == 0) and jd_text:
        prompt_text = f"""
        Đọc Mô tả công việc (JD) dưới đây và trích xuất từ 5 đến 8 kỹ năng quan trọng nhất.
        QUY TẮC NGÔN NGỮ:
        1. BẮT BUỘC dịch toàn bộ các kỹ năng mềm, kỹ năng nghiệp vụ chung sang TIẾNG VIỆT (Ví dụ: viết "Giao tiếp" thay vì "Communication", "Quản lý thời gian" thay vì "Time management").
        2. Chỉ giữ tiếng Anh đối với tên phần mềm, ngôn ngữ lập trình (VD: Python, Excel, SAP, MISA).
        3. CHỈ trả về duy nhất 1 mảng JSON các chuỗi ký tự.
        Ví dụ: ["Kế toán tổng hợp", "Excel nâng cao", "MISA", "Phân tích báo cáo tài chính", "Giao tiếp"]
        JD: {jd_text}
        """
        try:
            response = ollama.chat(
                model='qwen3.5:4b',
                messages=[
                    {'role': 'system', 'content': 'You are a strict data extractor. Return only a JSON array of strings.'},
                    {'role': 'user', 'content': prompt_text}
                ],
                options={'temperature': 0.1}
            )
            raw_msg = response.get('message', {}) if isinstance(response, dict) else getattr(response, 'message', {})
            raw_content = (raw_msg.get('content', '') if isinstance(raw_msg, dict) else getattr(raw_msg, 'content', '')).strip()

            match = re.search(r'\[[\s\S]*?\]', raw_content)
            if match:
                try:
                    extracted_skills = json.loads(match.group(0))
                    if isinstance(extracted_skills, list):
                        raw_jd_skills = [str(s).strip() for s in extracted_skills if isinstance(s, (str, int, float)) and str(s).strip()]
                except Exception:
                    pass

            if not raw_jd_skills:
                lines = raw_content.split('\n')
                manual_skills = []
                for line in lines:
                    clean_line = line.strip().replace('"', '').replace(',', '').replace('[', '').replace(']', '')
                    if clean_line and 2 <= len(clean_line) < 50 and '{' not in clean_line and '}' not in clean_line:
                        manual_skills.append(clean_line)
                raw_jd_skills = manual_skills
        except Exception as e:
            print(f"Lỗi AI trích xuất JD tự do: {e}")

        # Kết hợp thêm bộ quét kỹ năng đa ngành từ văn bản JD để đảm bảo độ phủ 100% mọi ngành nghề
        universal_jd_skills = extract_skills_universal_from_text(jd_text, max_skills=8)
        for u_sk in universal_jd_skills:
            if not any(skills_are_matching(u_sk, ex_sk) for ex_sk in raw_jd_skills):
                raw_jd_skills.append(u_sk)
            if len(raw_jd_skills) >= 9:
                break

        if not raw_jd_skills:
            raw_jd_skills = ["Kỹ năng chuyên môn ngành", "Phân tích & Giải quyết vấn đề", "Giao tiếp & Làm việc nhóm", "Microsoft Office"]

    jd_skills = {}
    if isinstance(raw_jd_skills, list) and len(raw_jd_skills) > 0:
        for idx, skill in enumerate(raw_jd_skills):
            if skill:
                skill_name = str(skill).strip()
                # Các kỹ năng đầu tiên là bắt buộc (weight=2.0), các kỹ năng sau là ưu tiên (weight=1.5)
                weight_val = 2.0 if idx < max(3, len(raw_jd_skills) - 2) else 1.5
                jd_skills[skill_name] = {"level": 3.0, "weight": weight_val, "category": skill_name.upper()}
    if not jd_skills:
        jd_skills = {"Kỹ năng chuyên môn": {"level": 3.0, "weight": 2.0, "category": "KỸ NĂNG CHUYÊN MÔN"}}

    radar_categories = {}
    for skill, req in jd_skills.items():
        cat = str(req.get("category", skill)).upper()
        if cat not in radar_categories:
            radar_categories[cat] = [0, 0]

    total_weight = 0.0
    weighted_score_sum = 0.0
    met_count = 0
    gap_count = 0
    gap_details = []
    matched_skill_names = []
    missing_skill_names = []

    for skill, req in jd_skills.items():
        w_i = float(req.get("weight", 1.5))
        yc_i = float(req.get("level", 3.0))
        cat = str(req.get("category", skill)).upper()
        total_weight += w_i

        sv_i = 0.0
        for k, v in sv_skills.items():
            if skills_are_matching(k, str(skill)):
                try:
                    sv_i = max(sv_i, float(v))
                except Exception:
                    sv_i = max(sv_i, 3.0)

        ratio = min(sv_i / yc_i, 1.0) if yc_i > 0 else 0.0
        weighted_score_sum += (w_i * ratio)

        if cat in radar_categories:
            radar_categories[cat][0] += ratio * 100
            radar_categories[cat][1] += 100

        if sv_i >= yc_i:
            met_count += 1
            matched_skill_names.append(str(skill))
        else:
            gap_count += 1
            missing_skill_names.append(str(skill))
            gap_details.append({
                "name": str(skill),
                "category": cat.lower(),
                "is_required": w_i >= 2.0,
                "status": "Chưa đạt" if sv_i == 0 else "Cần nâng cao",
                "reason": f"Yêu cầu mức {int(yc_i)}/5, hồ sơ hiện tại {'chưa ghi nhận kỹ năng này' if sv_i == 0 else f'đang ở mức {int(sv_i)}/5, cần bổ sung thêm thực hành'}."
            })

    skill_score = (weighted_score_sum / total_weight) * 100.0 if total_weight > 0 else 0.0

    radar_data = {}
    for cat, scores in radar_categories.items():
        if scores[1] > 0:
            radar_data[cat] = round(scores[0] / (scores[1] / 100.0))
        else:
            radar_data[cat] = 0

    avg_interest_level = 3.5
    if isinstance(sv_interests, list) and len(sv_interests) > 0:
        scores = []
        for item in sv_interests:
            if isinstance(item, dict):
                val = item.get("score") or item.get("level") or 3.5
                scores.append(float(val))
        if scores:
            avg_interest_level = sum(scores) / len(scores)
    elif isinstance(sv_interests, dict) and len(sv_interests) > 0:
        levels = [float(val) for val in sv_interests.values() if isinstance(val, (int, float))]
        if levels:
            avg_interest_level = sum(levels) / len(levels)

    interest_score = max(0.0, min(100.0, ((avg_interest_level - 1.0) / 4.0) * 100.0))

    exp_lower = exp_text.lower()
    type_coeff = 0.85
    if any(k in exp_lower for k in ["trưởng phòng", "manager", "senior", "trưởng nhóm", "lead", "giám sát", "supervisor"]):
        type_coeff = 1.5
    elif any(k in exp_lower for k in ["chuyên viên", "chính thức", "fulltime", "full-time", "nhân viên", "kỹ sư", "kế toán", "bartender"]):
        type_coeff = 1.25
    elif any(k in exp_lower for k in ["thực tập", "intern", "parttime", "part-time", "cộng tác viên", "fresher"]):
        type_coeff = 1.05
    elif any(k in exp_lower for k in ["cuộc thi", "hackathon", "đồ án", "dự án", "project", "luận văn", "nghiên cứu"]):
        type_coeff = 0.85
    elif any(k in exp_lower for k in ["clb", "câu lạc bộ", "tình nguyện", "ngoại khóa"]):
        type_coeff = 0.6

    relevance = 1.25 if len(exp_text) > 100 else (1.0 if len(exp_text) > 20 else 0.5)
    total_exp_points = relevance * type_coeff * 1.0
    experience_score = min(100.0, (total_exp_points / 1.5) * 100.0)
    if len(exp_text.strip()) == 0:
        experience_score = 40.0 if sv_skills else 0.0

    final_total_score = (0.50 * skill_score) + (0.25 * interest_score) + (0.25 * experience_score)
    rounded_total = round(final_total_score)

    # =========================================================
    # TẠO KẾT LUẬN PHÂN TÍCH SÂU SẮC & ĐA NGÀNH (AI REASONING)
    # =========================================================
    role_title_map = {
        "backend-php": "Kỹ sư Backend PHP / Laravel",
        "fullstack-laravel-tailwind": "Kỹ sư Fullstack Web (Laravel + Tailwind CSS)",
        "financial-analyst": "Chuyên viên Phân tích Tài chính",
        "general-accountant": "Kế toán tổng hợp",
        "corporate-legal-officer": "Chuyên viên Pháp chế doanh nghiệp",
        "legal-assistant": "Trợ lý Luật sư (Luật Kinh tế)",
        "custom": "Vị trí theo Mô tả công việc (JD) tự do"
    }
    target_role_display = body.get("role_title") or role_title_map.get(role_id, role_id)
    if role_id == "custom" and jd_text:
        first_line = jd_text.splitlines()[0].strip(" -•*#:")
        if 3 <= len(first_line) <= 65:
            target_role_display = first_line

    if rounded_total >= 75:
        fit_verdict = f"Hồ sơ của bạn có mức độ tương thích RẤT CAO ({rounded_total}%) với vị trí '{target_role_display}'."
    elif rounded_total >= 50:
        fit_verdict = f"Hồ sơ của bạn ở mức KHÁ TIỀM NĂNG ({rounded_total}%) cho vị trí '{target_role_display}', đã có nền tảng cơ bản nhưng cần bổ sung thêm các kỹ năng còn thiếu."
    else:
        fit_verdict = f"Hồ sơ hiện tại đạt {rounded_total}% độ khớp với vị trí '{target_role_display}', đang có khoảng cách kỹ năng lớn cần được lên lộ trình học bù đắp."

    matched_str = ", ".join(matched_skill_names[:5]) if matched_skill_names else "Chưa có kỹ năng khớp trực tiếp"
    gaps_str = ", ".join(missing_skill_names[:5]) if missing_skill_names else "Không có lỗ hổng kỹ năng lớn"

    ai_reasoning = _clean_spaced_hyphens(
        f"Kết luận tổng quan: {fit_verdict}\n"
        f"• Điểm mạnh hiện có: Đáp ứng {met_count}/{len(jd_skills)} nhóm kỹ năng yêu cầu của JD ({matched_str}) "
        f"với điểm Chuyên môn đạt {round(skill_score)}%, mức độ Yêu thích đạt {round(interest_score)}% và Kinh nghiệm thực tiễn đạt {round(experience_score)}%.\n"
        f"• Trọng tâm cần cải thiện ({gap_count} kỹ năng): {gaps_str}. "
        f"Khuyến nghị bạn chuyển sang bước 'Lộ trình học tập' để hệ thống tự động phân bổ bài học vào khung giờ rảnh và luyện tập trong 'Phòng phỏng vấn STAR'."
    )

    # =========================================================
    # LƯU TRỮ VÀO DATABASE CHO BẢNG JOBS VÀ ANALYSES (AUDIT DATABASE MODELS)
    # =========================================================
    db_job = None
    try:
        if jd_text:
            db_job = db.query(Job).filter(Job.description == jd_text).first()
            if not db_job:
                db_job = Job(
                    title=target_role_display,
                    description=jd_text,
                    requirements_json=json.dumps(list(jd_skills.keys()), ensure_ascii=False)
                )
                db.add(db_job)
                db.commit()
                db.refresh(db_job)
        else:
            db_job = db.query(Job).filter(Job.title == target_role_display).first()
            if not db_job:
                db_job = Job(
                    title=target_role_display,
                    description=f"Vị trí tuyển dụng: {target_role_display}",
                    requirements_json=json.dumps(list(jd_skills.keys()), ensure_ascii=False)
                )
                db.add(db_job)
                db.commit()
                db.refresh(db_job)
    except Exception as e_job:
        print(f"Lỗi lưu trữ Job: {e_job}")

    saved_analysis_id = None
    if not is_sample_mode and profile:
        try:
            analysis_record = Analysis(
                profile_id=profile.id,
                job_id=db_job.id if db_job else None,
                total_score=float(rounded_total),
                gaps_json=json.dumps(missing_skill_names, ensure_ascii=False),
                reasons_json=json.dumps({
                    "ai_reasoning": ai_reasoning,
                    "skill_score": round(skill_score),
                    "interest_score": round(interest_score),
                    "experience_score": round(experience_score),
                    "matched_skills": matched_skill_names,
                    "missing_skills": missing_skill_names,
                    "target_role": target_role_display
                }, ensure_ascii=False)
            )
            db.add(analysis_record)
            db.commit()
            db.refresh(analysis_record)
            saved_analysis_id = analysis_record.id
        except Exception as e_ana:
            print(f"Lỗi lưu trữ Analysis: {e_ana}")

    return {
        "analysis_id": saved_analysis_id,
        "job_id": db_job.id if db_job else None,
        "profile_id": profile_id,
        "role_id": role_id,
        "target_role": target_role_display,
        "final_total_score": rounded_total,
        "skill_score": round(skill_score),
        "interest_score": round(interest_score),
        "experience_score": round(experience_score),
        "met_skills_count": met_count,
        "gap_skills_count": gap_count,
        "matched_skills": matched_skill_names,
        "missing_skills": missing_skill_names,
        "ai_reasoning": ai_reasoning,
        "radar_data": radar_data,
        "gap_details": gap_details
    }


# ==========================================
# PHẦN 5: API TẠO LỘ TRÌNH HỌC TẬP & CẬP NHẬT LỊCH RẢNH GIỮ LỘ TRÌNH
# ==========================================
@app.post("/study-plan/generate")
def generate_study_plan(req: StudyPlanRequest, db: Session = Depends(get_db)):
    try:
        profile, streak_record = ensure_profile_and_streak(db, req.profile_id)
        target_pid = profile.id

        # 1. Xử lý danh sách kỹ năng cần học (loại bỏ các cụm từ chung chung như "Kỹ năng chuyên ngành")
        cleaned_gaps = [
            g.strip() for g in (req.gaps or [])
            if g and g.strip() and g.strip().lower() not in ("kỹ năng chuyên ngành", "kỹ năng hổng")
        ]
        missing_skills = cleaned_gaps if len(cleaned_gaps) > 0 else ["Nâng cao chuyên môn tổng hợp", "Kỹ năng mềm"]
        gaps_count = len(missing_skills)
        missing_skills_str = ", ".join(missing_skills)
        jd_context = (req.jd_text or "").strip()
        role_label = (req.target_role or "vị trí chuyên môn").strip()

        jd_extra_context = ""
        if jd_context:
            jd_extra_context = f"\n            Bối cảnh Mô tả công việc (JD) của nhà tuyển dụng cho vị trí '{role_label}': {jd_context[:1500]}"

        # 2. Ép chặt Prompt để AI buộc phải nhúng đích danh tên kỹ năng vào tiêu đề bài học
        prompt_text = f"""
        Lên lộ trình học tập cá nhân hóa để phát triển các kỹ năng sau: {missing_skills_str}.{jd_extra_context}
        
        QUY TẮC BẮT BUỘC (VI PHẠM SẼ BỊ LOẠI):
        1. BẮT BUỘC PHẢI NHÚNG ĐÍCH DANH TÊN KỸ NĂNG VÀO TIÊU ĐỀ BÀI HỌC (Ví dụ: thay vì viết "Thực hành kỹ năng chuyên ngành", PHẢI viết rõ "Thực hành tối ưu hóa truy vấn SQL" hoặc "Luyện tập Kỹ năng giao tiếp và đàm phán").
        2. TUYỆT ĐỐI KHÔNG dùng các từ chung chung như "kỹ năng chuyên ngành", "kỹ năng hổng" trong tiêu đề.
        3. Sáng tạo TỐI THIỂU {max(4, gaps_count)} bài học cụ thể, có tính ứng dụng thực tế cao.
        4. Không sử dụng ký tự gạch nối " - " trong tên bài học (hãy dùng dấu hai chấm ":" hoặc dấu phẩy ",").
        5. CHỈ trả về JSON hợp lệ theo định dạng:
        {{
            "tasks": [
                {{"title": "Nắm vững kiến thức cốt lõi về [Tên Kỹ Năng Cụ Thể]", "duration_minutes": 45}},
                {{"title": "Thực hành dự án thực tế: Ứng dụng [Tên Kỹ Năng Cụ Thể]", "duration_minutes": 60}}
            ]
        }}
        """

        max_retries = 2
        ai_tasks = []
        last_ai_err = None

        for attempt in range(max_retries):
            print(f"--- ĐANG GỌI AI TẠO LỘ TRÌNH (LẦN THỬ {attempt + 1}/{max_retries}) ---")
            try:
                response = ollama.chat(
                    model='qwen3.5:4b',
                    format='json',
                    messages=[
                        {'role': 'system', 'content': 'You are a JSON generator. Output valid JSON only, no markdown.'},
                        {'role': 'user', 'content': prompt_text}
                    ],
                    options={'temperature': 0.5}
                )

                raw_msg = response.get('message', {}) if isinstance(response, dict) else getattr(response, 'message', {})
                raw_content = (raw_msg.get('content', '') if isinstance(raw_msg, dict) else getattr(raw_msg, 'content', '')).strip()
                if "```json" in raw_content:
                    raw_content = raw_content.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_content:
                    raw_content = raw_content.split("```")[1].split("```")[0].strip()

                json_m = re.search(r'(\{[\s\S]*\})', raw_content)
                if json_m:
                    raw_content = json_m.group(1)

                ai_data = json.loads(raw_content)
                ai_tasks = _clean_spaced_hyphens(ai_data.get("tasks", []))

                if len(ai_tasks) > 0:
                    print(f"AI ĐÃ TẠO THÀNH CÔNG {len(ai_tasks)} BÀI HỌC CHO {gaps_count} KỸ NĂNG!")
                    break
            except Exception as e:
                last_ai_err = e
                print(f"Lỗi tạo lộ trình lần {attempt + 1}: {e}")

        if not ai_tasks:
            raise HTTPException(status_code=500, detail=f"Không thể gọi AI tạo lộ trình: {last_ai_err}")

        schedules = req.schedules if req.schedules else []
        profile.free_time_json = json.dumps([s.dict() for s in schedules], ensure_ascii=False)

        final_db_tasks = _slice_tasks_into_schedules(target_pid, ai_tasks, schedules)

        db.query(StudyTask).filter(StudyTask.profile_id == target_pid).delete()
        if final_db_tasks:
            db.add_all(final_db_tasks)

        # KHI TẠO LỘ TRÌNH MỚI -> RESET TOÀN BỘ DỮ LIỆU LIÊN QUAN ĐẾN LỘ TRÌNH (STREAK, HẠT GIỐNG, XP, BÁO CÁO)
        # LƯU Ý: KHÔNG reset last_leave_date để tránh việc người dùng lợi dụng tạo lại lộ trình nhằm xin cấp lại Thẻ nghỉ phép trong tuần
        streak_record.seed_stage = "Hạt giống"
        streak_record.current_xp = 0
        streak_record.weekly_xp = 0
        streak_record.current_streak = 0
        streak_record.last_study_date = ""
        streak_record.last_watered_date = ""
        # streak_record.last_leave_date = ""
        streak_record.recovery_mode = False
        streak_record.planned_tasks_weekly = sum(1 for t in final_db_tasks if t.status != "unscheduled")
        streak_record.total_roadmap_minutes = sum(t.duration_minutes for t in final_db_tasks)
        streak_record.completed_roadmap_minutes = 0
        streak_record.completed_tasks_weekly = 0
        streak_record.discipline_score = 0.0

        db.commit()
        for t in final_db_tasks:
            db.refresh(t)

        metrics = compute_roadmap_and_plant_metrics(db, target_pid, streak_record)
        db.commit()

        return {
            "message": "Đã tạo lộ trình mới và đặt lại toàn bộ thống kê học tập, chuỗi Streak và quá trình nuôi cây theo lộ trình mới!",
            "reset_stats": True,
            "roadmap_days": metrics["roadmap_days"],
            "target_plant_xp": metrics["target_plant_xp"],
            "stage_thresholds": metrics["stage_thresholds"],
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "scheduled_day": t.scheduled_day,
                    "duration_minutes": t.duration_minutes,
                    "unlock_time": t.unlock_time,
                    "deadline_time": t.deadline_time,
                    "status": t.status
                }
                for t in final_db_tasks
            ]
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print("LỖI:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@app.post("/study-plan/update-schedule")
def update_study_plan_schedule(req: UpdateScheduleRequest, db: Session = Depends(get_db)):
    """
    Cập nhật lịch rảnh mới cho người dùng nhưng VẪN GIỮ NGUYÊN lộ trình học tập hiện tại,
    giữ nguyên các bài đã hoàn thành, Streak, XP và quá trình nuôi cây.
    """
    profile, streak_record = ensure_profile_and_streak(db, req.profile_id)
    target_pid = profile.id

    existing_tasks = db.query(StudyTask).filter(StudyTask.profile_id == target_pid).order_by(StudyTask.id.asc()).all()
    if not existing_tasks:
        raise HTTPException(
            status_code=400,
            detail="Bạn chưa có lộ trình học tập nào để cập nhật lịch rảnh. Vui lòng tạo lộ trình trước!"
        )

    schedules = req.schedules if req.schedules else []
    if not schedules:
        raise HTTPException(status_code=400, detail="Vui lòng thêm ít nhất 1 khung giờ rảnh hợp lệ để xếp lại lịch!")

    completed_tasks = [t for t in existing_tasks if t.status == "completed"]
    pending_tasks = [t for t in existing_tasks if t.status != "completed"]

    if not pending_tasks:
        profile.free_time_json = json.dumps([s.dict() for s in schedules], ensure_ascii=False)
        db.commit()
        metrics = compute_roadmap_and_plant_metrics(db, target_pid, streak_record)
        return {
            "message": "Toàn bộ bài học trong lộ trình đã hoàn thành! Đã lưu khung giờ rảnh mới của bạn.",
            "roadmap_days": metrics["roadmap_days"],
            "target_plant_xp": metrics["target_plant_xp"],
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "scheduled_day": t.scheduled_day,
                    "duration_minutes": t.duration_minutes,
                    "unlock_time": t.unlock_time,
                    "deadline_time": t.deadline_time,
                    "status": t.status
                }
                for t in completed_tasks
            ]
        }

    # Gộp các phần chưa hoàn thành của cùng một bài học gốc để băm lại vừa vặn vào khung giờ rảnh mới
    consolidated_pending = []
    for pt in pending_tasks:
        base_title = re.sub(r'\s*\(Phần\s+\d+\)\s*$', '', (pt.title or "Bài học chuyên môn")).strip()
        dur = max(15, int(pt.duration_minutes or 45))
        if consolidated_pending and consolidated_pending[-1]["title"] == base_title:
            consolidated_pending[-1]["duration_minutes"] += dur
        else:
            consolidated_pending.append({"title": base_title, "duration_minutes": dur})

    rescheduled_db_tasks = _slice_tasks_into_schedules(target_pid, consolidated_pending, schedules)

    # Chỉ xóa các bài chưa hoàn thành, giữ nguyên các bài đã hoàn thành
    db.query(StudyTask).filter(StudyTask.profile_id == target_pid, StudyTask.status != "completed").delete()
    if rescheduled_db_tasks:
        db.add_all(rescheduled_db_tasks)

    profile.free_time_json = json.dumps([s.dict() for s in schedules], ensure_ascii=False)
    db.commit()

    all_updated_tasks = db.query(StudyTask).filter(StudyTask.profile_id == target_pid).order_by(StudyTask.id.asc()).all()
    streak_record.planned_tasks_weekly = sum(1 for t in all_updated_tasks if t.status != "unscheduled")
    metrics = compute_roadmap_and_plant_metrics(db, target_pid, streak_record)
    db.commit()

    return {
        "message": "Đã cập nhật lịch rảnh và phân bổ lại lộ trình hiện tại thành công (Giữ nguyên tiến độ & Streak)!",
        "roadmap_days": metrics["roadmap_days"],
        "target_plant_xp": metrics["target_plant_xp"],
        "stage_thresholds": metrics["stage_thresholds"],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "scheduled_day": t.scheduled_day,
                "duration_minutes": t.duration_minutes,
                "unlock_time": t.unlock_time,
                "deadline_time": t.deadline_time,
                "status": t.status
            }
            for t in all_updated_tasks
        ]
    }


@app.get("/study-plan/schedules/{profile_id}")
def get_saved_schedules(profile_id: str, db: Session = Depends(get_db)):
    # Chỉ đọc dữ liệu, không tự tạo hồ sơ mới khi tài khoản không tồn tại
    profile = db.query(Profile).filter(Profile.id == resolve_profile_id(profile_id)).first()
    if not profile:
        return {"schedules": []}
    try:
        saved = json.loads(profile.free_time_json) if profile.free_time_json else []
        if isinstance(saved, list):
            return {"schedules": saved}
    except Exception:
        pass
    return {"schedules": []}


@app.get("/study-plan/tasks/{profile_id}")
def get_saved_study_tasks(profile_id: str, db: Session = Depends(get_db)):
    pid = resolve_profile_id(profile_id)
    tasks = db.query(StudyTask).filter(StudyTask.profile_id == pid).order_by(StudyTask.id.asc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "scheduled_day": t.scheduled_day,
            "duration_minutes": t.duration_minutes,
            "unlock_time": t.unlock_time,
            "deadline_time": t.deadline_time,
            "status": t.status
        }
        for t in tasks
    ]


# ==========================================
# PHẦN 6: API DỌN DẸP DATABASE (TESTING)
# ==========================================
@app.delete("/system/reset-database/")
def reset_all_database_tables():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Đã reset sạch sẽ toàn bộ Database theo chuẩn đề án TQL!"}


# ==========================================
# PHẦN 7: ĐĂNG KÝ & ĐĂNG NHẬP (KÈM MÃ HÓA SHA-256 & KIỂM TRA ĐỊNH DẠNG)
# ==========================================
@app.post("/auth/register")
def register_user(data: RegisterInput, db: Session = Depends(get_db)):
    clean_name = (data.name or "").strip()
    if not clean_name:
        raise HTTPException(
            status_code=400,
            detail="Họ và tên không được để trống! Vui lòng nhập đầy đủ họ tên."
        )

    clean_email = (data.email or "").strip().lower()
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not clean_email or not re.match(email_regex, clean_email):
        raise HTTPException(
            status_code=400,
            detail="Định dạng Email không hợp lệ! Vui lòng nhập đúng cấu trúc (Ví dụ: ten@gmail.com)."
        )

    pwd = (data.password or "").strip()
    if len(pwd) < 6:
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu quá ngắn! Mật khẩu phải có tối thiểu 6 ký tự để đảm bảo an toàn."
        )

    weak_passwords = {"123456", "12345678", "123456789", "abcdef", "password", "111111", "000000", "qwerty", "admin123"}
    if pwd.lower() in weak_passwords or len(set(pwd)) <= 2:
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu quá yếu và dễ đoán! Vui lòng chọn mật khẩu phức tạp hơn kết hợp cả chữ cái và số."
        )

    existing = db.query(Profile).filter(Profile.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")

    # Băm (Hash) mật khẩu bằng SHA-256 trước khi lưu xuống Database
    hashed_pw = hashlib.sha256(pwd.encode()).hexdigest()

    new_user = Profile(
        name=clean_name, email=clean_email, password=hashed_pw,
        skills_json="{}", interests_json="[]", experience_text="", free_time_json="[]"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    ensure_profile_and_streak(db, new_user.id)

    return {"message": "Đăng ký thành công!", "profile_id": new_user.id, "name": new_user.name, "email": new_user.email}


@app.post("/auth/login")
def login_user(data: LoginInput, db: Session = Depends(get_db)):
    clean_email = (data.email or "").strip().lower()
    raw_pwd = (data.password or "").strip()
    hashed_pw = hashlib.sha256(raw_pwd.encode()).hexdigest()

    user = db.query(Profile).filter(Profile.email == clean_email, Profile.password == hashed_pw).first()
    if not user:
        # Tương thích ngược nếu tài khoản cũ lưu mật khẩu thuần: tự động nâng cấp lên SHA-256
        legacy_user = db.query(Profile).filter(Profile.email == clean_email, Profile.password == raw_pwd).first()
        if legacy_user:
            legacy_user.password = hashed_pw
            db.commit()
            user = legacy_user
        else:
            raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác!")

    ensure_profile_and_streak(db, user.id)

    return {"message": "Đăng nhập thành công!", "profile_id": user.id, "name": user.name, "email": user.email}


@app.get("/auth/verify/{profile_id}")
def verify_user_session(profile_id: str, db: Session = Depends(get_db)):
    """
    Kiểm tra phiên đăng nhập lưu trong trình duyệt có còn hợp lệ hay không
    (ví dụ Database vừa bị xóa / reset trong Docker thì tài khoản cũ không còn tồn tại).
    Endpoint này KHÔNG tự tạo hồ sơ mới.
    """
    if not str(profile_id).strip().isdigit():
        raise HTTPException(status_code=404, detail="Phiên đăng nhập không hợp lệ.")
    user = db.query(Profile).filter(Profile.id == int(profile_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Tài khoản không còn tồn tại trong hệ thống.")
    return {"valid": True, "profile_id": user.id, "name": user.name, "email": user.email}


# ==========================================
# PHẦN 8: HOÀN THÀNH BÀI HỌC, TƯỚI CÂY, PHIẾU NGHỈ PHÉP & GAMIFICATION
# ==========================================
@app.post("/study-plan/complete-task")
def complete_study_task(data: TaskCompleteInput, db: Session = Depends(get_db)):
    task = db.query(StudyTask).filter(StudyTask.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

    if task.status == "completed":
        raise HTTPException(status_code=400, detail="Bài học này đã được hoàn thành trước đó!")

    if task.status == "excused":
        raise HTTPException(
            status_code=400,
            detail="Bài học này đã được miễn và vô hiệu hóa do bạn đã đăng ký Thẻ nghỉ phép ngày hôm nay!"
        )

    now_vn = vn_now()

    # Chốt chặn thời gian thực theo đúng múi giờ Việt Nam (UTC+7), cho phép dung sai 1 phút
    if task.unlock_time:
        try:
            unlock_dt = datetime.fromisoformat(task.unlock_time)
            if now_vn + timedelta(minutes=1) < unlock_dt:
                raise HTTPException(
                    status_code=400,
                    detail=f"Chưa đến giờ mở khóa! Bài học mở lúc: {unlock_dt.strftime('%H:%M %d/%m/%Y')} (Giờ hiện tại: {now_vn.strftime('%H:%M %d/%m/%Y')})"
                )
        except ValueError:
            pass

    task.status = "completed"
    profile_id = task.profile_id

    _, record = ensure_profile_and_streak(db, profile_id)

    # 1. Logic 1 ngày làm bài chỉ tính tối đa 1 Streak (kèm bảo vệ bởi Phiếu nghỉ phép 1 lần/tuần)
    today = now_vn.date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    two_days_ago_str = (today - timedelta(days=2)).strftime("%Y-%m-%d")

    if record.last_study_date == today_str:
        # Trong cùng 1 ngày đã làm bài rồi -> giữ nguyên Streak hiện tại (không cộng dồn thêm)
        record.current_streak = max(1, record.current_streak)
    else:
        # Bài học đầu tiên hoàn thành trong ngày hôm nay
        if record.last_study_date == yesterday_str:
            record.current_streak += 1
        elif (
            record.current_streak > 0
            and record.last_leave_date in (yesterday_str, today_str)
            and record.last_study_date in (two_days_ago_str, yesterday_str, "")
        ):
            record.current_streak += 1
        else:
            record.current_streak = 1
        record.last_study_date = today_str
        record.recovery_mode = False

    # 2. Cộng XP bài học (+50 XP)
    xp_reward = 50
    record.current_xp += xp_reward
    record.weekly_xp += xp_reward

    # 3. Tính toán tiến độ cây trồng gắn liền với lộ trình (Tổng bài * 50 XP + Số ngày lộ trình * 25 XP tưới cây)
    metrics = compute_roadmap_and_plant_metrics(db, profile_id, record)
    db.commit()

    return {
        "message": "Hoàn thành bài học thành công!",
        "added_xp": xp_reward,
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "current_streak": record.current_streak,
        "progress_percent": metrics["progress_percent"],
        "plant_progress_percent": metrics["plant_progress_percent"],
        "target_plant_xp": metrics["target_plant_xp"],
        "roadmap_days": metrics["roadmap_days"],
        "stage_thresholds": metrics["stage_thresholds"],
        "completed_roadmap_minutes": metrics["completed_roadmap_minutes"],
        "total_roadmap_minutes": metrics["total_roadmap_minutes"],
        "discipline_score": metrics["discipline_score"],
        "current_seed_stage": metrics["seed_stage"]
    }


@app.get("/gamification/{profile_id}")
def get_gamification_data(profile_id: str, db: Session = Depends(get_db)):
    profile, record = ensure_profile_and_streak(db, profile_id)
    pid = profile.id

    now_vn = vn_now()
    today = now_vn.date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    two_days_ago_str = (today - timedelta(days=2)).strftime("%Y-%m-%d")

    # Kiểm tra đứt chuỗi Streak nếu bỏ học quá hạn mà không có Phiếu nghỉ phép bảo vệ
    if record.current_streak > 0 and record.last_study_date:
        if record.last_study_date not in (today_str, yesterday_str):
            protected_by_leave = (
                record.last_leave_date in (yesterday_str, today_str)
                and record.last_study_date == two_days_ago_str
            )
            if not protected_by_leave:
                record.current_streak = 0
                record.recovery_mode = True

    has_watered = (record.last_watered_date == today_str)
    leave_used_this_week = bool(record.last_leave_date and _is_same_iso_week(record.last_leave_date, today_str))
    leave_pass_remaining = 0 if leave_used_this_week else 1
    leave_weekday = None
    if leave_used_this_week:
        try:
            leave_weekday = datetime.strptime(record.last_leave_date, "%Y-%m-%d").isoweekday()
        except Exception:
            leave_weekday = None

    metrics = compute_roadmap_and_plant_metrics(db, pid, record)
    db.commit()

    # CHỈ đánh dấu tích (✓) vào các thứ trong tuần khi người dùng đã bấm HOÀN THÀNH bài học (t.status == "completed")
    completed_weekdays = []
    for t in metrics["all_tasks"]:
        if t.status == "completed":
            if t.scheduled_day and t.scheduled_day != "Chờ xếp lịch":
                try:
                    task_date = datetime.strptime(t.scheduled_day, "%d/%m/%Y")
                    iso_wd = task_date.isoweekday()
                    if iso_wd not in completed_weekdays:
                        completed_weekdays.append(iso_wd)
                except ValueError:
                    pass

    if not completed_weekdays and metrics["completed_tasks"] > 0 and record.last_study_date and _is_same_iso_week(record.last_study_date, today_str):
        try:
            study_wd = datetime.strptime(record.last_study_date, "%Y-%m-%d").isoweekday()
            if study_wd not in completed_weekdays:
                completed_weekdays.append(study_wd)
        except ValueError:
            pass

    return {
        "current_streak": record.current_streak,
        "seed_stage": metrics["seed_stage"],
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "has_watered_today": has_watered,
        "completed_roadmap_minutes": metrics["completed_roadmap_minutes"],
        "total_roadmap_minutes": metrics["total_roadmap_minutes"],
        "discipline_score": metrics["discipline_score"],
        "progress_percent": metrics["progress_percent"],
        "plant_progress_percent": metrics["plant_progress_percent"],
        "target_plant_xp": metrics["target_plant_xp"],
        "roadmap_days": metrics["roadmap_days"],
        "stage_thresholds": metrics["stage_thresholds"],
        "completed_tasks": metrics["completed_tasks"],
        "total_tasks": metrics["total_tasks"],
        "completed_weekdays": completed_weekdays,
        "registered_weekdays": completed_weekdays,
        "leave_pass_remaining": leave_pass_remaining,
        "last_leave_date": record.last_leave_date or "",
        "leave_weekday": leave_weekday
    }


@app.post("/gamification/water-plant/{profile_id}")
def water_plant(profile_id: str, db: Session = Depends(get_db)):
    profile, record = ensure_profile_and_streak(db, profile_id)
    pid = profile.id

    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == pid).all()
    if not all_tasks:
        raise HTTPException(
            status_code=400,
            detail="Bạn cần tạo lộ trình học tập trước khi bắt đầu tưới cây tích lũy XP theo lộ trình!"
        )

    today_str = vn_now().strftime("%Y-%m-%d")
    if record.last_watered_date == today_str:
        raise HTTPException(status_code=400, detail="Hôm nay bạn đã tưới nước rồi! Hãy quay lại vào ngày mai nhé.")

    record.last_watered_date = today_str
    record.current_xp += 25
    record.weekly_xp += 25

    metrics = compute_roadmap_and_plant_metrics(db, pid, record)
    db.commit()

    return {
        "message": f"Tưới nước thành công (+25 XP)! Tiến độ nuôi cây theo lộ trình ({metrics['roadmap_days']} ngày): {metrics['plant_progress_percent']}%",
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "seed_stage": metrics["seed_stage"],
        "plant_progress_percent": metrics["plant_progress_percent"],
        "target_plant_xp": metrics["target_plant_xp"],
        "roadmap_days": metrics["roadmap_days"],
        "stage_thresholds": metrics["stage_thresholds"]
    }


@app.post("/gamification/use-leave-pass/{profile_id}")
def use_leave_pass(profile_id: str, db: Session = Depends(get_db)):
    """
    Đăng ký sử dụng Thẻ Phiếu Nghỉ Phép (Giới hạn tối đa 1 lần / 1 tuần).
    Chỉ cho phép sử dụng khi ngày hôm đó có lịch học theo đăng ký.
    Khi sử dụng, các bài học của ngày hôm đó sẽ được miễn và vô hiệu hóa (status = 'excused')
    để bảo lưu chuỗi ngày học (Streak).
    """
    profile, record = ensure_profile_and_streak(db, profile_id)
    now_vn = vn_now()
    today_ymd = now_vn.strftime("%Y-%m-%d")
    today_dmy = now_vn.strftime("%d/%m/%Y")

    # 1. Kiểm tra giới hạn 1 lần / 1 tuần
    if record.last_leave_date and _is_same_iso_week(record.last_leave_date, today_ymd):
        raise HTTPException(
            status_code=400,
            detail=f"Bạn đã sử dụng Phiếu nghỉ phép trong tuần này rồi (Ngày {record.last_leave_date}). Giới hạn tối đa 1 lần/tuần!"
        )

    # 2. Kiểm tra xem người dùng đã có lộ trình học tập chưa
    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == profile.id).all()
    if not all_tasks:
        raise HTTPException(
            status_code=400,
            detail="Bạn chưa có lộ trình học tập nào. Vui lòng tạo lộ trình trước khi sử dụng Phiếu nghỉ phép!"
        )

    # 3. Lọc ra các bài học có lịch trong ngày hôm nay
    today_tasks = [
        t for t in all_tasks
        if (t.scheduled_day and (t.scheduled_day.strip() == today_dmy or t.scheduled_day.strip() == today_ymd))
        or (t.unlock_time and t.unlock_time.startswith(today_ymd))
    ]

    if not today_tasks:
        raise HTTPException(
            status_code=400,
            detail=f"Hôm nay ({today_dmy}) bạn không có lịch học nào theo đăng ký. Thẻ nghỉ phép chỉ áp dụng vào những ngày có lịch học!"
        )

    # 4. Kiểm tra xem bài học hôm nay đã hoàn thành hết chưa
    uncompleted_today = [t for t in today_tasks if t.status not in ("completed", "excused")]
    if not uncompleted_today:
        raise HTTPException(
            status_code=400,
            detail="Bạn đã hoàn thành tất cả bài học của ngày hôm nay rồi, không cần sử dụng Phiếu nghỉ phép!"
        )

    # 5. Vô hiệu hóa các bài học hôm nay (chuyển sang 'excused')
    for t in uncompleted_today:
        t.status = "excused"

    record.last_leave_date = today_ymd
    record.recovery_mode = False
    compute_roadmap_and_plant_metrics(db, profile.id, record)
    db.commit()

    return {
        "message": f"Đăng ký Phiếu nghỉ phép hôm nay ({today_dmy}) thành công! Đã miễn và vô hiệu hóa {len(uncompleted_today)} bài học hôm nay. Chuỗi Streak của bạn được bảo lưu an toàn.",
        "last_leave_date": today_ymd,
        "leave_pass_remaining": 0,
        "leave_weekday": now_vn.date().isoweekday(),
        "current_streak": record.current_streak,
        "excused_tasks_count": len(uncompleted_today)
    }


# ==========================================
# PHẦN 9: PHỎNG VẤN AI NGẪU NHIÊN MỖI VÒNG (VI / EN) & CHẤM ĐIỂM STAR
# ==========================================
@app.post("/interview/generate")
async def generate_interview_questions(payload: InterviewRequest):
    persona = payload.persona or "tech_lead"
    level = payload.level or "mid"
    language = (payload.language or "vi").strip().lower()
    is_en = (language == "en")
    context = payload.analysis_context if (payload.analysis_context and isinstance(payload.analysis_context, dict)) else {}

    role_id = str(context.get("role_id", "")).strip()
    if is_en:
        role_title_map = {
            "backend-php": "Backend PHP / Laravel Engineer",
            "fullstack-laravel-tailwind": "Fullstack Web Engineer (Laravel + Tailwind CSS)",
            "financial-analyst": "Financial Analyst",
            "general-accountant": "General Accountant",
            "corporate-legal-officer": "Corporate Legal Officer",
            "legal-assistant": "Legal Assistant (Corporate & Economic Law)"
        }
        default_role = "Domain Specialist"
    else:
        role_title_map = {
            "backend-php": "Kỹ sư Backend PHP / Laravel",
            "fullstack-laravel-tailwind": "Kỹ sư Fullstack Web (Laravel + Tailwind CSS)",
            "financial-analyst": "Chuyên viên Phân tích Tài chính",
            "general-accountant": "Kế toán tổng hợp",
            "corporate-legal-officer": "Chuyên viên Pháp chế doanh nghiệp",
            "legal-assistant": "Trợ lý Luật sư (Luật Kinh tế)"
        }
        default_role = "Chuyên viên chuyên môn"

    target_role = (
        role_title_map.get(role_id)
        or context.get("target_role")
        or context.get("role_title")
        or context.get("job_title")
        or default_role
    )

    raw_skills = context.get("matched_skills") or context.get("skills") or []
    if not raw_skills and isinstance(context.get("radar_data"), dict):
        raw_skills = [k for k, v in context["radar_data"].items() if v and float(v) >= 50]
    candidate_skills = [str(s) for s in raw_skills[:5]] if isinstance(raw_skills, list) else [str(raw_skills)]

    raw_gaps = context.get("missing_skills") or context.get("gaps") or []
    if not raw_gaps and isinstance(context.get("gap_details"), list):
        raw_gaps = [g.get("name") for g in context["gap_details"] if isinstance(g, dict) and g.get("name")]
    gaps = [str(g) for g in raw_gaps[:4]] if isinstance(raw_gaps, list) else [str(raw_gaps)]

    rng = random.SystemRandom()
    nonce_val = payload.random_nonce or rng.randint(100000, 999999)

    if is_en:
        focus_angles_en = [
            "Workflow optimization and resolving real-world bottlenecks",
            "Quality assurance and preventing operational or technical errors",
            "Handling urgent incidents under tight deadlines",
            "Data-driven decision making and measurable KPIs",
            "Rapid adaptation to unfamiliar tools or domain requirements",
            "Cross-functional collaboration and stakeholder persuasion",
            "Resolving professional disagreements within a team",
            "Balancing delivery speed with high quality standards"
        ]
        chosen_angles = rng.sample(focus_angles_en, 3)
        prompt = f"""[SYSTEM]: You are an expert AI Interviewer (Session ID: #{nonce_val}). You MUST output ONLY valid raw JSON without markdown or explanation.
CRITICAL LANGUAGE RULE: The user selected ENGLISH interview mode. Every single field (title, question, category, tag, suggested_star.situation, suggested_star.task, suggested_star.action, suggested_star.result) MUST be written 100% in ENGLISH. Do NOT use Vietnamese anywhere in your response.
FORMATTING RULE: Do NOT use spaced hyphens (" - ") in any generated text; write natural sentences using commas or periods instead.
If any input role or skill names below are in Vietnamese, translate them naturally into professional English inside your generated questions and STAR hints.

Generate EXACTLY 3 distinct, realistic interview questions tailored to these specific angles:
• Question 1 Angle (Technical / Domain Expertise): {chosen_angles[0]}
• Question 2 Angle (Situational / Problem Solving): {chosen_angles[1]}
• Question 3 Angle (Behavioral / Soft Skills): {chosen_angles[2]}

[CANDIDATE CONTEXT]:
• Target Role: {target_role}
• Seniority Level: {level}
• Interviewer Persona: {persona}
• Current Skills: {candidate_skills}
• Skill Gaps to Probe: {gaps}

[REQUIRED JSON SCHEMA (Exactly 3 questions in English)]:
{{
"questions": [
    {{
        "id": 1,
        "title": "Concise English Title for Question 1",
        "question": "Full interview question 1 in English...",
        "category": "Technical",
        "difficulty": "3/5",
        "tag": "Core",
        "suggested_star": {{"situation": "English hint for Situation...", "task": "English hint for Task...", "action": "English hint for Action...", "result": "English hint for Result..."}}
    }},
    {{
        "id": 2,
        "title": "Concise English Title for Question 2",
        "question": "Full interview question 2 in English...",
        "category": "Situational",
        "difficulty": "4/5",
        "tag": "Important",
        "suggested_star": {{"situation": "English hint for Situation...", "task": "English hint for Task...", "action": "English hint for Action...", "result": "English hint for Result..."}}
    }},
    {{
        "id": 3,
        "title": "Concise English Title for Question 3",
        "question": "Full interview question 3 in English...",
        "category": "Behavioral",
        "difficulty": "5/5",
        "tag": "Advanced",
        "suggested_star": {{"situation": "English hint for Situation...", "task": "English hint for Task...", "action": "English hint for Action...", "result": "English hint for Result..."}}
    }}
]
}}"""
    else:
        focus_angles_vi = [
            "Tối ưu hóa quy trình và xử lý điểm nghẽn thực tế",
            "Kiểm soát chất lượng đầu ra và phòng ngừa rủi ro sai sót",
            "Giải quyết sự cố khẩn cấp khi thời hạn (deadline) cận kề",
            "Ra quyết định dựa trên dữ liệu và số liệu đo lường",
            "Thích nghi nhanh với công cụ/nghiệp vụ mới trong dự án",
            "Phối hợp liên phòng ban và thuyết phục các bên liên quan",
            "Xử lý bất đồng quan điểm chuyên môn trong nhóm",
            "Cân bằng giữa tốc độ hoàn thành và độ chính xác tiêu chuẩn"
        ]
        chosen_angles = rng.sample(focus_angles_vi, 3)
        prompt = f"""[HỆ THỐNG]: Bạn là một chuyên gia tuyển dụng AI chuyên nghiệp (Mã phiên ngẫu nhiên: #{nonce_val}). BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm văn bản giải thích.
YÊU CẦU TỐI THƯỢNG: BẠN PHẢI TẠO RA ĐÚNG 3 CÂU HỎI KHÁC NHAU, MỚI MẺ BẰNG TIẾNG VIỆT, BÁM SÁT GÓC ĐỘ ĐƯỢC CHỈ ĐỊNH DƯỚI ĐÂY.
QUY TẮC XƯNG HÔ CHUYÊN NGHIỆP:
Người phỏng vấn tự xưng là 'Tôi', gọi ứng viên là 'bạn' (hoặc 'ứng viên').
TUYỆT ĐỐI KHÔNG dùng các đại từ khác như 'mình', 'em', 'anh/chị', 'chúng tôi', 'mày/tao'.
Duy trì phong thái lịch thiệp, tôn trọng, khách quan và chuẩn mực doanh nghiệp.

QUY TẮC TRÁNH TRÙNG LẶP TUYỆT ĐỐI:
3 câu hỏi trong cùng một bộ PHẢI hoàn toàn khác nhau về chủ đề, nội dung và khía cạnh hỏi:
- Câu 1: Bắt buộc là Chuyên môn kỹ thuật / nghiệp vụ cốt lõi ({chosen_angles[0]}).
- Câu 2: Bắt buộc là Tình huống thực tế / Xử lý sự cố ({chosen_angles[1]}).
- Câu 3: Bắt buộc là Kỹ năng mềm / Phối hợp làm việc nhóm / Đàm phán ({chosen_angles[2]}).
TUYỆT ĐỐI KHÔNG để các câu hỏi bị trùng ý hoặc hỏi lại cùng một nội dung.

QUY TẮC TRÌNH BÀY:
1. Tuyệt đối KHÔNG được chép lại, KHÔNG ĐƯỢC nhắc lại các "Góc độ câu hỏi" vào trong nội dung câu hỏi.
2. Hãy đóng vai giám khảo, hỏi trực tiếp ứng viên một cách tự nhiên nhất (Ví dụ: "Bạn sẽ làm gì nếu...", "Hãy kể về một lần...").
3. Hạn chế tối đa sử dụng ký tự gạch nối (" - ") trong tiêu đề, nội dung câu hỏi và gợi ý STAR (hãy viết câu tự nhiên bằng dấu phẩy hoặc dấu chấm).

[THÔNG TIN ĐẦU VÀO]:
• Vị trí: {target_role}
• Cấp độ: {level}
• Phong cách người phỏng vấn: {persona}
• Kỹ năng: {candidate_skills}
• Cần cải thiện: {gaps}

[CẤU TRÚC JSON BẮT BUỘC (Gồm đúng 3 câu)]:
{{
"questions": [
    {{
        "id": 1,
        "title": "Tiêu đề câu 1",
        "question": "Nội dung câu 1...",
        "category": "Chuyên môn",
        "difficulty": "3/5",
        "tag": "Cơ bản",
        "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
    }},
    {{
        "id": 2,
        "title": "Tiêu đề câu 2",
        "question": "Nội dung câu 2...",
        "category": "Tình huống",
        "difficulty": "4/5",
        "tag": "Quan trọng",
        "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
    }},
    {{
        "id": 3,
        "title": "Tiêu đề câu 3",
        "question": "Nội dung câu 3...",
        "category": "Kỹ năng mềm",
        "difficulty": "5/5",
        "tag": "Nâng cao",
        "suggested_star": {{"situation": "...", "task": "...", "action": "...", "result": "..."}}
    }}
]
}}"""

    print(f"--- Đang tạo bộ câu hỏi phỏng vấn ({language.upper()} | #{nonce_val}) cho vị trí: {target_role} ---")
    response = ollama.chat(
        model='qwen3.5:4b',
        format='json',
        messages=[{'role': 'user', 'content': prompt}],
        options={
            'temperature': 0.8,
            'seed': int(nonce_val) % 2147483647,
            'num_predict': 2500,
        }
    )

    content = ""
    if hasattr(response, 'message') and response.message:
        content = getattr(response.message, 'content', '')
    elif isinstance(response, dict):
        content = response.get('message', {}).get('content', '')

    content = content.strip()
    if not content:
        raise HTTPException(status_code=500, detail="AI trả về nội dung rỗng khi tạo câu hỏi phỏng vấn.")

    json_match = re.search(r'(\{[\s\S]*\})', content)
    if not json_match:
        raise HTTPException(status_code=500, detail="AI không trả về định dạng JSON hợp lệ.")

    content = re.sub(r',\s*([\]}])', r'\1', json_match.group(1))
    ai_output = json.loads(content)
    raw_questions = _clean_spaced_hyphens(ai_output.get("questions", []))
    if not isinstance(raw_questions, list) or len(raw_questions) == 0:
        raise HTTPException(status_code=500, detail="AI tạo chưa đủ câu hỏi phỏng vấn.")

    # LỌC TRÙNG LẶP TUYỆT ĐỐI TRONG BỘ CÂU HỎI
    unique_questions = []
    seen_titles = []
    for q in raw_questions:
        title_norm = q.get("title", "").strip().lower()
        ques_norm = q.get("question", "").strip().lower()

        is_dup = False
        for st, sq in seen_titles:
            if title_norm and title_norm == st:
                is_dup = True
                break
            if ques_norm and ques_norm == sq:
                is_dup = True
                break
            if len(title_norm) > 10 and (title_norm in st or st in title_norm):
                is_dup = True
                break
        if not is_dup:
            seen_titles.append((title_norm, ques_norm))
            unique_questions.append(q)

    # Nếu AI vô tình tạo câu trùng và thiếu câu, bổ sung các câu hỏi dự phòng chuyên sâu không trùng
    if len(unique_questions) < 3:
        backup_pool = [
            {
                "title": f"Chuyên môn cốt lõi về {target_role}",
                "question": f"Trong công việc của một {target_role}, khi thiết kế giải pháp kỹ thuật, bạn áp dụng các nguyên tắc hoặc chuẩn mực nào để đảm bảo tính ổn định và mở rộng lâu dài?",
                "category": "Chuyên môn",
                "difficulty": "3/5",
                "tag": "Cốt lõi",
                "suggested_star": {"situation": "Mô tả bối cảnh dự án có bài toán kỹ thuật", "task": "Nhiệm vụ đảm bảo tính ổn định và tối ưu", "action": "Áp dụng thiết kế module, quy chuẩn code và review", "result": "Hệ thống vận hành thông suốt"}
            },
            {
                "title": f"Xử lý sự cố khẩn cấp {target_role}",
                "question": f"Hãy chia sẻ về một sự cố bất ngờ hoặc lỗi nghiêm trọng bạn từng gặp trong công việc liên quan đến {target_role} và các bước bạn đã thực hiện để tìm nguyên nhân gốc rễ và khắc phục?",
                "category": "Tình huống",
                "difficulty": "4/5",
                "tag": "Thực chiến",
                "suggested_star": {"situation": "Bối cảnh sự cố phát sinh bất ngờ gần deadline", "task": "Trách nhiệm phân tích và dập tắt sự cố", "action": "Thu thập log, phân tích nguyên nhân và cô lập lỗi", "result": "Khắc phục triệt để và viết tài liệu phòng ngừa"}
            },
            {
                "title": f"Phối hợp và thuyết phục trong {target_role}",
                "question": f"Khi bạn và đồng nghiệp hoặc cấp trên có bất đồng quan điểm chuyên môn về giải pháp triển khai trong công việc {target_role}, bạn đã làm gì để thuyết phục và đạt được tiếng nói chung?",
                "category": "Kỹ năng mềm",
                "difficulty": "3/5",
                "tag": "Làm việc nhóm",
                "suggested_star": {"situation": "Tình huống có sự khác biệt quan điểm giải pháp", "task": "Mục tiêu đạt được đồng thuận hiệu quả nhất", "action": "Đưa ra dẫn chứng thực tế, đo lường số liệu và lắng nghe", "result": "Đội ngũ thống nhất phương án tối ưu nhất"}
            }
        ]
        for bq in backup_pool:
            if len(unique_questions) >= 3:
                break
            unique_questions.append(bq)

    for idx, q in enumerate(unique_questions[:3]):
        q["id"] = idx + 1

    return {"questions": unique_questions[:3], "language": language}


@app.post("/interview/submit-and-evaluate/{question_id}")
async def evaluate_answer(question_id: int, payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    language = (payload.language or "vi").strip().lower()
    is_en = (language == "en")

    if is_en:
        prompt = f"""[SYSTEM]: You are a strict but fair Senior Hiring Manager evaluating a candidate's interview answer using the STAR method (Situation, Task, Action, Result).
You MUST output ONLY valid raw JSON without any markdown or extra text.
CRITICAL LANGUAGE RULE: Write your entire evaluation ("feedback" and "improved_answer") 100% in ENGLISH.
FORMATTING RULE: Do NOT use spaced hyphens (" - ") in your text; write natural sentences using commas or periods.

[INPUT]:
• Interview Question: {payload.question_text}
• Candidate's Answer: {payload.student_answer}

[REQUIRED JSON FORMAT]:
{{
"evaluation": {{
    "score": <float number from 1.0 to 10.0 based on depth, realism, and STAR structure>,
    "feedback": "Detailed constructive feedback in English: Strengths and areas for improvement.",
    "improved_answer": "A strong sample answer written in English following the STAR structure (Situation, Task, Action, Result)."
}}
}}"""
    else:
        prompt = f"""[HỆ THỐNG]: Bạn là một giám khảo phỏng vấn nhân sự chuyên nghiệp, công tâm và sắc sảo. 
Nhiệm vụ của bạn là đánh giá và chấm điểm câu trả lời của ứng viên dựa trên câu hỏi phỏng vấn theo phương pháp STAR (Situation, Task, Action, Result).
BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm theo văn bản giải thích.
QUY TẮC XƯNG HÔ CHUYÊN NGHIỆP:
Luôn xưng là 'Tôi' (người đánh giá) và gọi ứng viên là 'bạn'. Tuyệt đối không xưng 'mình', 'em', 'anh/chị', 'chúng tôi'. Giọng điệu mang tính xây dựng, khách quan và chuẩn mực doanh nghiệp.
QUY TẮC TRÌNH BÀY: Không sử dụng ký tự gạch nối (" - ") trong lời nhận xét và đáp án mẫu; hãy viết câu văn mạch lạc bằng dấu chấm và dấu phẩy.

[THÔNG TIN ĐẦU VÀO]:
• Câu hỏi phỏng vấn: {payload.question_text}
• Câu trả lời của ứng viên: {payload.student_answer}

[CẤU TRÚC JSON BẮT BUỘC]:
{{
"evaluation": {{
    "score": <Chấm điểm số thực từ 1.0 đến 10.0 dựa trên độ chi tiết, tính thực tế và cấu trúc STAR>,
    "feedback": "Nhận xét chi tiết: Điểm tốt là gì? Cần cải thiện điều gì?",
    "improved_answer": "Viết lại một câu trả lời mẫu xuất sắc hơn theo chuẩn STAR (Situation, Task, Action, Result)"
}}
}}"""

    print(f"--- Đang chấm điểm câu hỏi ID: {question_id} ({language.upper()}) ---")
    response = ollama.chat(
        model='qwen3.5:4b',
        format='json',
        messages=[{'role': 'user', 'content': prompt}],
        options={'temperature': 0.3, 'num_predict': 2000}
    )
    content = getattr(response.message, 'content', '') if hasattr(response, 'message') else response.get('message', {}).get('content', '')
    json_match = re.search(r'(\{[\s\S]*\})', content)
    if not json_match:
        raise HTTPException(status_code=500, detail="AI không trả về kết quả chấm điểm dạng JSON hợp lệ.")
    ai_output = json.loads(re.sub(r',\s*([\]}])', r'\1', json_match.group(1)))

    eval_obj = _clean_spaced_hyphens(ai_output.get("evaluation", {}))
    try:
        numeric_score = round(float(eval_obj.get("score", 7.0)), 1)
    except Exception:
        numeric_score = 7.0
    numeric_score = max(1.0, min(10.0, numeric_score))
    eval_obj["score"] = numeric_score

    xp_reward = 50 if numeric_score >= 7.0 else 10

    profile, streak_record = ensure_profile_and_streak(db, payload.profile_id)
    streak_record.current_xp += xp_reward
    streak_record.weekly_xp += xp_reward
    compute_roadmap_and_plant_metrics(db, profile.id, streak_record)
    db.commit()

    # LƯU TRỮ VÀO DATABASE CHO BẢNG INTERVIEWS (AUDIT DATABASE MODELS)
    new_interview = Interview(
        profile_id=profile.id,
        job_id=payload.job_id,
        questions_json=json.dumps({
            "question_id": question_id,
            "question_text": payload.question_text,
            "category": payload.question_category or "Phỏng vấn chuyên sâu",
            "language": language
        }, ensure_ascii=False),
        student_answer_text=payload.student_answer,
        evaluation_json=json.dumps({"evaluation": eval_obj}, ensure_ascii=False)
    )
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "evaluation": eval_obj,
        "interview_id": new_interview.id,
        "added_xp": xp_reward,
        "current_xp": streak_record.current_xp,
        "weekly_xp": streak_record.weekly_xp
    }


# ==========================================
# PHẦN 10: FEEDBACK & TRUY VẤN LỊCH SỬ TỪ DATABASE (AUDIT MODELS)
# ==========================================
@app.post("/analyses/feedback")
@app.post("/analyses/feedback/")
def submit_match_feedback(data: FeedbackInput, db: Session = Depends(get_db)):
    """Lưu trữ phản hồi người dùng về độ chính xác và tương thích vào bảng feedbacks trong Database."""
    profile, _ = ensure_profile_and_streak(db, data.profile_id)
    new_feedback = Feedback(
        profile_id=profile.id,
        job_id=data.job_id,
        is_match=data.is_match
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return {
        "status": "success",
        "message": "Cảm ơn bạn đã gửi phản hồi đánh giá độ tương thích!",
        "feedback_id": new_feedback.id
    }


@app.get("/analyses/history/{profile_id}")
def get_analysis_history(profile_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách các lần phân tích JD/CV đã lưu trong bảng analyses của Database."""
    profile, _ = ensure_profile_and_streak(db, profile_id)
    records = db.query(Analysis).filter(Analysis.profile_id == profile.id).order_by(Analysis.id.desc()).limit(10).all()
    history = []
    for r in records:
        try:
            reasons = json.loads(r.reasons_json) if r.reasons_json else {}
        except Exception:
            reasons = {}
        try:
            gaps = json.loads(r.gaps_json) if r.gaps_json else []
        except Exception:
            gaps = []
        job = db.query(Job).filter(Job.id == r.job_id).first() if r.job_id else None
        history.append({
            "id": r.id,
            "job_id": r.job_id,
            "job_title": job.title if job else reasons.get("target_role", "Vị trí tuyển dụng"),
            "total_score": r.total_score,
            "gaps": gaps,
            "reasons": reasons
        })
    return {"history": history}


@app.get("/interview/history/{profile_id}")
def get_interview_history(profile_id: str, db: Session = Depends(get_db)):
    """Lấy lịch sử các phiên phỏng vấn đã lưu trong bảng interviews của Database."""
    profile, _ = ensure_profile_and_streak(db, profile_id)
    records = db.query(Interview).filter(Interview.profile_id == profile.id).order_by(Interview.id.desc()).limit(15).all()
    results = []
    for r in records:
        try:
            q_obj = json.loads(r.questions_json) if r.questions_json else {}
        except Exception:
            q_obj = {"question_text": "Câu hỏi phỏng vấn"}
        try:
            eval_data = json.loads(r.evaluation_json) if r.evaluation_json else {}
        except Exception:
            eval_data = {}
        results.append({
            "id": r.id,
            "job_id": r.job_id,
            "question_info": q_obj,
            "student_answer": r.student_answer_text,
            "evaluation": eval_data.get("evaluation", eval_data)
        })
    return {"history": results}
