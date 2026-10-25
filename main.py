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
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
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

    # 12. Công cụ Văn phòng, Ngoại ngữ & Kỹ năng mềm cốt lõi
    "Microsoft Office (Word / Excel / PowerPoint)": ["microsoft office", "tin học văn phòng", "ms office", "word", "powerpoint", "mos", "ic3"],
    "Tiếng Anh chuyên ngành / Giao tiếp": ["tiếng anh", "english", "toeic", "ielts", "toefl", "giao tiếp tiếng anh", "tiếng anh thương mại", "tiếng anh pháp lý"],
    "Ngoại ngữ thứ 2 (Trung / Nhật / Hàn)": ["tiếng trung", "hsk", "tiếng nhật", "jlpt", "tiếng hàn", "topik", "tiếng pháp"],
    "Kỹ năng thuyết trình": ["thuyết trình", "presentation", "public speaking", "trình bày"],
    "Giao tiếp & Phối hợp": ["giao tiếp", "communication", "ứng xử"],
    "Làm việc nhóm (Teamwork)": ["teamwork", "làm việc nhóm", "phối hợp nhóm", "team player"],
    "Giải quyết vấn đề & Tư duy phản biện": ["giải quyết vấn đề", "problem solving", "tư duy phản biện", "critical thinking", "phân tích"],
    "Quản lý thời gian & Lập kế hoạch": ["quản lý thời gian", "time management", "lập kế hoạch", "planning", "đa nhiệm", "multitasking"],
    "Lãnh đạo & Quản lý đội nhóm": ["lãnh đạo", "leadership", "quản lý nhóm", "team lead", "mentor"],
}


def _kw_in_text(kw: str, text_lower: str) -> bool:
    """Kiểm tra từ khóa xuất hiện độc lập (word boundary) để tránh khớp nhầm từ con (VD: 'git' trong 'digital', 'api' trong 'capital')."""
    kw_clean = kw.strip().lower()
    if not kw_clean or kw_clean not in text_lower:
        return False
    pattern = r'(?<![a-zA-Z0-9_À-ỹ])' + re.escape(kw_clean) + r'(?![a-zA-Z0-9_À-ỹ])'
    return bool(re.search(pattern, text_lower))


def extract_skills_universal_from_text(text: str, max_skills: int = 12) -> list[str]:
    """
    Trích xuất kỹ năng đa ngành từ bất kỳ văn bản CV hoặc JD tự do nào.
    Kết hợp từ điển 12 nhóm ngành lớn + NLP bóc tách cụm từ theo dòng yêu cầu.
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

    # Kiểm tra nếu cả 2 cùng thuộc 1 nhóm trong UNIVERSAL_SKILL_CATALOG
    for skill_label, kws in UNIVERSAL_SKILL_CATALOG.items():
        lbl_low = skill_label.lower()
        c_hit = (c == lbl_low) or any(_kw_in_text(kw, c) for kw in kws if len(kw.strip()) >= 2)
        if not c_hit:
            continue
        j_hit = (j == lbl_low) or any(_kw_in_text(kw, j) for kw in kws if len(kw.strip()) >= 2)
        if j_hit:
            return True

    # So khớp theo token chính (bỏ từ nối phổ biến)
    stop_tokens = {"kỹ", "năng", "cơ", "bản", "nâng", "cao", "chuyên", "môn", "về", "và", "hoặc", "quản", "lý", "phân", "tích", "nghiệp", "vụ"}
    c_tokens = {t for t in re.split(r'[\s/,\-\(\)]+', c) if len(t) >= 3 and t not in stop_tokens}
    j_tokens = {t for t in re.split(r'[\s/,\-\(\)]+', j) if len(t) >= 3 and t not in stop_tokens}
    if c_tokens and j_tokens and (c_tokens & j_tokens):
        return True
    return False


# ==========================================
# NGÂN HÀNG CÂU HỎI PHỎNG VẤN ĐA CHIỀU (RANDOM HÓA MỖI VÒNG)
# ==========================================
def generate_randomized_interview_questions(target_role: str, level: str, candidate_skills: list, gaps: list, persona: str = "tech_lead") -> list[dict]:
    """Tạo bộ 3 câu hỏi phỏng vấn hoàn toàn ngẫu nhiên ở mỗi lần gọi, bám sát vị trí, kỹ năng và lỗ hổng của ứng viên."""
    rng = random.SystemRandom()

    role_display = target_role if target_role and target_role != "Professional" else "Chuyên viên chuyên môn"
    skill_1 = candidate_skills[0] if len(candidate_skills) > 0 else "kỹ năng chuyên môn cốt lõi"
    skill_2 = candidate_skills[1] if len(candidate_skills) > 1 else skill_1
    gap_1 = gaps[0] if len(gaps) > 0 else "nghiệp vụ nâng cao"
    gap_2 = gaps[1] if len(gaps) > 1 else gap_1

    level_map = {"intern": "Thực tập sinh / Fresher", "fresher": "Fresher", "junior": "Junior", "mid": "Mid-level", "senior": "Senior / Trưởng nhóm"}
    level_label = level_map.get(str(level).lower(), str(level).capitalize())

    persona_map = {
        "tech_lead": "Trưởng bộ phận Chuyên môn (Tech / Domain Lead)",
        "hiring_manager": "Quản lý Tuyển dụng (Hiring Manager)",
        "hr_director": "Giám đốc Nhân sự (HR Director)",
        "startup_founder": "Nhà sáng lập / Giám đốc điều hành (Founder / CEO)"
    }
    persona_label = persona_map.get(str(persona).lower(), "Chuyên gia Tuyển dụng")

    # 8 mẫu câu hỏi Chuyên môn (Câu 1) - Random chọn 1
    cat1_pool = [
        {
            "title": f"Vận dụng thực chiến {skill_1} trong công việc",
            "question": f"Dưới góc nhìn của {persona_label}, ở vị trí {role_display} ({level_label}), bạn hãy chia sẻ một dự án hoặc nhiệm vụ thực tế mà bạn đã áp dụng **{skill_1}** (kết hợp với **{skill_2}**). Đâu là quyết định chuyên môn khó nhất bạn đã đưa ra và kết quả đo lường được là gì?",
            "star": {
                "situation": f"Mô tả bối cảnh dự án hoặc bài toán nghiệp vụ tại vị trí {role_display} đòi hỏi áp dụng {skill_1}.",
                "task": "Xác định mục tiêu cụ thể, tiêu chuẩn chất lượng hoặc KPI bạn cần đạt được.",
                "action": f"Trình bày quy trình triển khai từng bước bằng {skill_1} và {skill_2}, cách bạn kiểm soát sai sót.",
                "result": "Đưa ra con số định lượng (tiết kiệm thời gian, tăng độ chính xác hoặc hoàn thành vượt tiến độ)."
            }
        },
        {
            "title": f"Tối ưu hóa quy trình & Chất lượng với {skill_1}",
            "question": f"Khi đảm nhận vai trò {role_display}, nếu bạn phát hiện quy trình hiện tại liên quan đến **{skill_1}** đang tốn nhiều thời gian và dễ phát sinh lỗi lặp lại, bạn sẽ phân tích nguyên nhân gốc rễ và cải tiến như thế nào?",
            "star": {
                "situation": f"Quy trình xử lý công việc liên quan đến {skill_1} gặp điểm nghẽn làm chậm tiến độ chung.",
                "task": "Tìm ra nguyên nhân cốt lõi và đề xuất giải pháp chuẩn hóa nhằm giảm tỷ lệ sai sót.",
                "action": f"Ứng dụng {skill_1} và {skill_2} để thiết lập checklist kiểm tra, tự động hóa hoặc tối ưu thao tác.",
                "result": "Giảm thiểu rõ rệt thời gian xử lý và nâng cao chất lượng đầu ra của cả bộ phận."
            }
        },
        {
            "title": f"Kiểm soát chất lượng & Xử lý lỗi chuyên môn ({skill_1})",
            "question": f"Trong quá trình thực hiện nghiệp vụ {role_display}, làm thế nào để bạn đảm bảo đầu ra khi sử dụng **{skill_1}** luôn đạt độ chính xác cao nhất? Hãy kể về một lần bạn phát hiện sớm một rủi ro/lỗi tiềm ẩn trước khi bàn giao.",
            "star": {
                "situation": f"Trong giai đoạn nghiệm thu sản phẩm/báo cáo của vị trí {role_display}, phát hiện dấu hiệu bất thường về dữ liệu/kỹ thuật.",
                "task": "Rà soát toàn diện, khoanh vùng lỗi và khắc phục triệt để trước giờ bàn giao chính thức.",
                "action": f"Sử dụng các kỹ thuật kiểm tra chéo trong {skill_1}, đối chiếu tiêu chuẩn đầu ra và chỉnh sửa ngay.",
                "result": "Bàn giao đúng hạn với độ chính xác 100%, được cấp trên và khách hàng/đối tác đánh giá cao."
            }
        },
        {
            "title": f"Chuyển hóa lý thuyết {skill_1} thành giá trị thực tế",
            "question": f"Nhiều ứng viên vị trí {role_display} nắm lý thuyết về **{skill_1}** nhưng lúng túng khi gặp dữ liệu/bài toán thực tế phức tạp. Bạn hãy minh chứng năng lực thực hành của mình qua một sản phẩm hoặc kết quả cụ thể bạn từng làm.",
            "star": {
                "situation": "Đối mặt với một yêu cầu thực tế phức tạp khác xa các bài tập mẫu thông thường.",
                "task": f"Vận dụng linh hoạt {skill_1} và {skill_2} để giải quyết trọn vẹn yêu cầu thực tế đó.",
                "action": "Phân tách bài toán lớn thành các mô-đun nhỏ, thử nghiệm giải pháp và tinh chỉnh theo phản hồi thực tế.",
                "result": "Hoàn thiện sản phẩm/hồ sơ đạt chuẩn thực tế và rút ra bộ kinh nghiệm quý báu."
            }
        },
        {
            "title": f"So sánh & Lựa chọn phương pháp trong {role_display}",
            "question": f"Khi giải quyết một bài toán tại vị trí {role_display}, thường có nhiều cách tiếp cận khác nhau liên quan đến **{skill_1}** và **{skill_2}**. Bạn dựa vào những tiêu chí nào (hiệu năng, chi phí, thời gian, độ an toàn) để chọn phương án tối ưu?",
            "star": {
                "situation": "Dự án đứng trước 2 phương án triển khai chuyên môn có ưu và nhược điểm riêng.",
                "task": "Đánh giá khách quan để chọn ra phương án phù hợp nhất với nguồn lực và thời hạn của tổ chức.",
                "action": f"Lập bảng so sánh dựa trên tiêu chí chuyên môn {skill_1}, thử nghiệm nhanh và bảo vệ phương án trước nhóm.",
                "result": "Phương án được chọn vận hành ổn định, đáp ứng đúng mục tiêu đề ra và tiết kiệm nguồn lực."
            }
        }
    ]

    # 8 mẫu câu hỏi Tình huống & Khắc phục khoảng trống kỹ năng (Câu 2) - Random chọn 1
    cat2_pool = [
        {
            "title": f"Chinh phục nhanh kỹ năng mới: {gap_1}",
            "question": f"Hồ sơ của bạn hiện đang cần bổ sung thêm về **{gap_1}**. Giả sử ngay tuần đầu nhận việc ở vị trí {role_display}, sếp giao một nhiệm vụ đòi hỏi áp dụng **{gap_1}** và **{gap_2}** trong 5 ngày tới, bạn sẽ xoay sở ra sao?",
            "star": {
                "situation": f"Nhận nhiệm vụ khẩn cấp tại vị trí {role_display} có yêu cầu sử dụng {gap_1} — mảng kiến thức bạn chưa có nhiều kinh nghiệm sâu.",
                "task": "Vừa phải nắm bắt nhanh nguyên lý cốt lõi của kỹ năng mới, vừa đảm bảo hoàn thành công việc đúng hạn.",
                "action": f"Lập kế hoạch học tập trung vào đúng phần {gap_1} phục vụ trực tiếp cho dự án, tham khảo tài liệu chuẩn và hỏi nhanh anh/chị đi trước.",
                "result": "Hoàn thành nhiệm vụ đúng tiến độ, không làm gián đoạn công việc chung và làm chủ được kỹ năng mới."
            }
        },
        {
            "title": f"Xử lý sự cố phát sinh ngoài dự kiến ({gap_1})",
            "question": f"Tình huống thực tế: Khi dự án {role_display} đang chạy nước rút trước giờ nghiệm thu 24 giờ, một sự cố nghiêm trọng liên quan đến **{gap_1}** bất ngờ xảy ra. Với tư cách là người phụ trách ({level_label}), thứ tự ưu tiên hành động của bạn là gì?",
            "star": {
                "situation": f"Sự cố phát sinh ở khâu {gap_1} ngay sát thời điểm bàn giao quan trọng của dự án.",
                "task": "Khoanh vùng rủi ro, khắc phục sự cố nhanh nhất và thông báo minh bạch cho các bên liên quan.",
                "action": "Giữ bình tĩnh, đánh giá mức độ ảnh hưởng, áp dụng phương án dự phòng (workaround) và phối hợp xử lý dứt điểm nguyên nhân.",
                "result": "Khắc phục sự cố kịp thời trước giờ G, giảm thiểu thiệt hại và bổ sung quy trình phòng ngừa tái diễn."
            }
        },
        {
            "title": f"Ra quyết định khi thiếu thông tin trong mảng {gap_1}",
            "question": f"Ở vị trí {role_display}, nếu khách hàng hoặc cấp trên đưa ra một yêu cầu rất mơ hồ liên quan đến **{gap_1}** nhưng lại cần bản đề xuất ngay trong ngày, bạn sẽ đặt những câu hỏi gì và xử lý tình huống này như thế nào?",
            "star": {
                "situation": f"Nhận đề bài chưa rõ ràng các thông số đầu vào liên quan đến {gap_1} trong khi thời gian phản hồi rất ngắn.",
                "task": "Làm rõ nhu cầu thực sự của các bên và xây dựng bản đề xuất khả thi ngay trong ngày.",
                "action": "Chủ động liệt kê các câu hỏi trọng tâm để xác nhận kỳ vọng, đồng thời chuẩn bị 2 phương án (Cơ bản & Mở rộng) kèm giả định rõ ràng.",
                "result": "Giúp cấp trên/khách hàng chốt phương án nhanh chóng ngay buổi họp đầu tiên."
            }
        },
        {
            "title": f"Cân bằng giữa Tiến độ gấp và Chất lượng ({gap_1})",
            "question": f"Giả sử bạn đang thực hiện một hạng mục liên quan đến **{gap_1}** cho vị trí {role_display}, nhưng khối lượng công việc tăng gấp đôi vào phút chót trong khi deadline không đổi. Bạn sẽ thương lượng và sắp xếp lại công việc thế nào?",
            "star": {
                "situation": "Khối lượng công việc phát sinh đột biến sát hạn chót mà nguồn lực và thời gian không thay đổi.",
                "task": "Đảm bảo các hạng mục cốt lõi nhất vẫn hoàn thành đúng hạn với chất lượng cao.",
                "action": f"Phân loại đầu việc theo ma trận ưu tiên (Must-have vs Nice-to-have), tập trung xử lý phần cốt lõi của {gap_1} trước và báo cáo sớm để điều phối nguồn lực.",
                "result": "Bàn giao đúng hạn toàn bộ phần cốt lõi và hoàn tất phần mở rộng ngay sau đó mà không ảnh hưởng chất lượng."
            }
        },
        {
            "title": f"Chuyển đổi công cụ / quy trình mới ({gap_1})",
            "question": f"Nếu công ty quyết định thay đổi quy trình cũ sang áp dụng tiêu chuẩn/công cụ mới là **{gap_1}** và **{gap_2}** cho vị trí {role_display}, bạn sẽ làm gì để thích nghi nhanh nhất mà không làm giảm năng suất?",
            "star": {
                "situation": f"Bộ phận chuyển đổi sang áp dụng {gap_1} nhằm nâng cao hiệu suất làm việc.",
                "task": "Nhanh chóng làm quen và chuyển giao công việc sang quy trình/công cụ mới một cách trơn tru.",
                "action": f"Chủ động tự học ngoài giờ, đối chiếu điểm tương đồng giữa kỹ năng {skill_1} sẵn có với {gap_1} để rút ngắn thời gian làm quen.",
                "result": "Làm chủ công cụ mới chỉ sau thời gian ngắn và hỗ trợ các thành viên khác trong nhóm cùng chuyển đổi."
            }
        }
    ]

    # 8 mẫu câu hỏi Kỹ năng mềm & Văn hóa làm việc (Câu 3) - Random chọn 1
    cat3_pool = [
        {
            "title": "Giải quyết bất đồng quan điểm trong đội nhóm",
            "question": f"Khi làm việc nhóm ở lĩnh vực {role_display}, nếu ý kiến chuyên môn của bạn (dựa trên **{skill_1}**) trái ngược với một thành viên có thâm niên hơn, bạn sẽ trao đổi và thuyết phục như thế nào để giữ hòa khí mà vẫn tìm ra giải pháp đúng?",
            "star": {
                "situation": "Trong cuộc họp dự án, có sự khác biệt lớn về hướng tiếp cận giữa bạn và một đồng nghiệp nhiều kinh nghiệm.",
                "task": "Bảo vệ góc nhìn chuyên môn một cách cầu thị và hướng cả nhóm tới giải pháp hiệu quả nhất cho dự án.",
                "action": "Lắng nghe trọn vẹn lý lẽ của đồng nghiệp, sau đó trình bày phương án của mình bằng số liệu/minh chứng thực tế thay vì cảm tính.",
                "result": "Hai bên kết hợp được ưu điểm của cả hai phương án, giúp dự án đạt kết quả vượt mong đợi và gắn kết tinh thần nhóm."
            }
        },
        {
            "title": "Tiếp nhận phản hồi gay gắt (Constructive Feedback)",
            "question": f"Hãy kể về một lần sản phẩm, báo cáo hoặc phần việc của bạn bị giảng viên, sếp hoặc khách hàng phê bình thẳng thắn. Cảm xúc lúc đó của bạn thế nào và bạn đã biến phản hồi đó thành hành động cải thiện ra sao?",
            "star": {
                "situation": "Bản dự thảo/sản phẩm đầu tiên chưa đáp ứng đúng kỳ vọng khắt khe của người đánh giá.",
                "task": "Tiếp nhận toàn bộ góp ý một cách chuyên nghiệp và nâng cấp chất lượng sản phẩm trong thời gian ngắn.",
                "action": "Ghi chép chi tiết từng điểm cần sửa, hỏi lại để làm rõ tiêu chuẩn mong muốn, phân tích nguyên nhân thiếu sót và làm lại bản mới hoàn chỉnh.",
                "result": "Bản cập nhật sau được đánh giá rất cao về thái độ cầu tiến và chất lượng vượt trội."
            }
        },
        {
            "title": "Quản lý áp lực đa nhiệm (Multi-tasking & Deadline)",
            "question": f"Ở môi trường làm việc năng động của vị trí {role_display}, nếu cùng một lúc bạn nhận 3 đầu việc từ 3 người khác nhau và ai cũng bảo là 'cần gấp ngay hôm nay', bạn sẽ xử lý và giao tiếp với họ như thế nào?",
            "star": {
                "situation": "Nhận đồng thời 3 yêu cầu khẩn cấp từ các bên liên quan trong cùng một buổi làm việc.",
                "task": "Sắp xếp thứ tự thực hiện hợp lý mà không làm bất kỳ bên nào bị động hay hiểu lầm.",
                "action": "Đánh giá nhanh mức độ tác động (Impact) và độ khẩn cấp (Urgency) của từng việc, trao đổi minh bạch mốc giờ bàn giao cụ thể với từng người.",
                "result": "Hoàn thành cả 3 đầu việc đúng cam kết và xây dựng được uy tín về tính kỷ luật, chủ động."
            }
        },
        {
            "title": "Khả năng tự học & Phát triển bản thân dài hạn",
            "question": f"Ngành nghề của vị trí {role_display} thay đổi rất nhanh, đặc biệt là các yêu cầu mới như **{gap_1}**. Bạn đang duy trì thói quen tự học và rèn luyện kỷ luật cá nhân hằng tuần như thế nào để không bị tụt hậu?",
            "star": {
                "situation": f"Nhận thấy thị trường tuyển dụng vị trí {role_display} ngày càng đòi hỏi cao về {gap_1} bên cạnh {skill_1}.",
                "task": "Xây dựng lộ trình tự học có kỷ luật mỗi tuần để lấp đầy khoảng trống năng lực.",
                "action": "Chia nhỏ mục tiêu học tập theo từng khung giờ rảnh cố định trong tuần, kết hợp học lý thuyết với làm dự án nhỏ thực hành.",
                "result": "Hình thành chuỗi thói quen học tập đều đặn (Streak), liên tục bổ sung kỹ năng mới vào hồ sơ năng lực."
            }
        },
        {
            "title": "Tinh thần trách nhiệm khi xảy ra sai sót",
            "question": f"Không ai làm việc mà không từng mắc sai lầm. Hãy chia sẻ một lần bạn hoặc nhóm của bạn gặp một sai sót trong công việc/đồ án. Bạn đã đứng ra nhận trách nhiệm và khắc phục hậu quả như thế nào?",
            "star": {
                "situation": "Một sai sót trong khâu kiểm tra dẫn đến kết quả đầu ra bị lệch so với kế hoạch ban đầu.",
                "task": "Chủ động nhận trách nhiệm, xử lý hậu quả ngay lập tức và khôi phục niềm tin của tập thể.",
                "action": "Không đổ lỗi, lập tức báo cáo trung thực kèm theo 2 phương án khắc phục cụ thể và làm thêm giờ để sửa triệt để lỗi.",
                "result": "Sự cố được giải quyết êm đẹp, đồng thời thiết lập được quy trình kiểm tra 2 lớp giúp nhóm không bao giờ lặp lại lỗi đó."
            }
        }
    ]

    q1 = rng.choice(cat1_pool)
    q2 = rng.choice(cat2_pool)
    q3 = rng.choice(cat3_pool)

    return [
        {
            "id": 1,
            "title": q1["title"],
            "question": q1["question"],
            "category": "Chuyên môn",
            "difficulty": "3/5",
            "tag": "Cơ bản",
            "suggested_star": q1["star"]
        },
        {
            "id": 2,
            "title": q2["title"],
            "question": q2["question"],
            "category": "Tình huống",
            "difficulty": "4/5",
            "tag": "Quan trọng",
            "suggested_star": q2["star"]
        },
        {
            "id": 3,
            "title": q3["title"],
            "question": q3["question"],
            "category": "Kỹ năng mềm",
            "difficulty": "5/5",
            "tag": "Nâng cao",
            "suggested_star": q3["star"]
        }
    ]


# ==========================================
# HỆ THỐNG KẾT NỐI OLLAMA THÔNG MINH & FALLBACK TỨC THÌ
# ==========================================
_WORKING_OLLAMA_HOST = None
_LAST_FAILED_PROBE_TS = 0.0
_PULLING_HOSTS = set()

def _probe_ollama_host(host: str, target_model: str = "qwen3.5:4b"):
    try:
        req = urllib.request.Request(
            f"{host.rstrip('/')}/api/tags",
            headers={"Host": "localhost:11434"}
        )
        with urllib.request.urlopen(req, timeout=0.6) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                has_model = any(target_model in m for m in models)
                return True, has_model
    except Exception:
        pass
    return False, False

def _bg_pull_model(host: str, target_model: str):
    key = f"{host}|{target_model}"
    if key in _PULLING_HOSTS:
        return
    _PULLING_HOSTS.add(key)
    try:
        print(f"[Ollama Background] Đang tải ngầm model {target_model} tại {host}...")
        client = ollama.Client(host=host, headers={"Host": "localhost:11434"}, timeout=900.0)
        client.pull(target_model)
        print(f"[Ollama Background] Đã tải xong model {target_model} tại {host}!")
    except Exception as e:
        print(f"[Ollama Background] Lỗi tải ngầm model tại {host}: {e}")
    finally:
        _PULLING_HOSTS.discard(key)

def _build_fallback_ai_content(messages: list) -> str:
    prompt = "\n".join(str(m.get("content", "")) for m in (messages or []) if isinstance(m, dict))
    prompt_lower = prompt.lower()

    # 1. Trích xuất CV (/profiles/extract-cv/)
    if "extract candidate info from the cv text" in prompt_lower or "cv text:" in prompt_lower:
        cv_part = prompt.split("CV TEXT:")[-1].split("REQUIRED JSON FORMAT:")[0].strip() if "CV TEXT:" in prompt else prompt
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', cv_part)
        found_email = email_match.group(0) if email_match else "email@example.com"
        lines = [ln.strip() for ln in cv_part.splitlines() if ln.strip() and 2 < len(ln.strip()) < 60]
        found_name = lines[0] if lines else "Candidate Name"
        extracted_list = extract_skills_universal_from_text(cv_part, max_skills=10)
        detected_skills = {sk: 4 for sk in extracted_list}
        if not detected_skills:
            detected_skills = {
                "Kỹ năng chuyên môn": 4,
                "Giao tiếp & Phối hợp": 4,
                "Làm việc nhóm (Teamwork)": 4,
                "Microsoft Office (Word / Excel / PowerPoint)": 4
            }
        return json.dumps({
            "name": found_name,
            "email": found_email,
            "skills": detected_skills,
            "experience": cv_part[:600]
        }, ensure_ascii=False)

    # 2. Tạo lộ trình học tập (/study-plan/generate)
    if "lên lộ trình học tập cá nhân hóa" in prompt_lower:
        gaps_raw = ""
        m = re.search(r"kỹ năng bị hổng sau:\s*(.+?)\.", prompt, re.DOTALL)
        if m:
            gaps_raw = m.group(1).strip()
        gaps_list = [g.strip() for g in gaps_raw.split(",") if g.strip()]
        if not gaps_list:
            gaps_list = ["Kỹ năng chuyên ngành", "Thực hành dự án thực tế"]
        tasks = []
        for gap in gaps_list:
            tasks.append({"title": f"Nền tảng cốt lõi & Quy trình chuẩn: {gap}", "duration_minutes": 45})
            tasks.append({"title": f"Thực hành bài tập tình huống thực tế: {gap}", "duration_minutes": 60})
        return json.dumps({"tasks": tasks}, ensure_ascii=False)

    # 3. Tạo bộ 3 câu hỏi phỏng vấn ngẫu nhiên (/interview/generate)
    if "bạn phải tạo ra đúng 3 câu hỏi khác nhau" in prompt_lower:
        role_m = re.search(r"-\s*Vị trí:\s*(.+)", prompt)
        level_m = re.search(r"-\s*Cấp độ:\s*(.+)", prompt)
        skills_m = re.search(r"-\s*Kỹ năng:\s*(.+)", prompt)
        gaps_m = re.search(r"-\s*Cần cải thiện:\s*(.+)", prompt)
        persona_m = re.search(r"-\s*Phong cách người phỏng vấn:\s*(.+)", prompt)
        role_str = role_m.group(1).strip() if role_m else "Chuyên viên"
        level_str = level_m.group(1).strip() if level_m else "mid"
        persona_str = persona_m.group(1).strip() if persona_m else "tech_lead"

        def _parse_list_str(s: str) -> list:
            if not s:
                return []
            try:
                val = json.loads(s.replace("'", '"'))
                if isinstance(val, list):
                    return [str(x) for x in val if x]
            except Exception:
                pass
            return [x.strip(" []'\"") for x in s.split(",") if x.strip(" []'\"")]

        skills_list = _parse_list_str(skills_m.group(1).strip() if skills_m else "")
        gaps_list = _parse_list_str(gaps_m.group(1).strip() if gaps_m else "")
        questions = generate_randomized_interview_questions(role_str, level_str, skills_list, gaps_list, persona_str)
        return json.dumps({"questions": questions}, ensure_ascii=False)

    # 4. Chấm điểm câu trả lời phỏng vấn (/interview/submit-and-evaluate/{question_id})
    if "chấm điểm câu trả lời của ứng viên" in prompt_lower:
        q_m = re.search(r"-\s*Câu hỏi phỏng vấn:\s*(.+?)\n\s*-\s*Câu trả lời của ứng viên:", prompt, re.DOTALL)
        a_m = re.search(r"-\s*Câu trả lời của ứng viên:\s*(.+?)\n\s*\[CẤU TRÚC JSON BẮT BUỘC\]", prompt, re.DOTALL)
        q_text = q_m.group(1).strip() if q_m else "Câu hỏi phỏng vấn chuyên môn"
        a_text = a_m.group(1).strip() if a_m else ""
        words = a_text.split()
        word_count = len(words)
        a_lower = a_text.lower()

        star_signals = [
            "tình huống", "bối cảnh", "khi làm", "dự án", "nhiệm vụ", "mục tiêu", "trách nhiệm",
            "hành động", "triển khai", "thực hiện", "giải quyết", "phối hợp", "sử dụng",
            "kết quả", "đạt được", "giảm", "tăng", "hoàn thành", "%", "học được",
            "situation", "task", "action", "result"
        ]
        hit_signals = sum(1 for kw in star_signals if kw in a_lower)
        has_numbers = bool(re.search(r'\d+', a_text))

        if word_count < 15:
            score = round(4.5 + min(1.5, hit_signals * 0.3), 1)
            fb = (
                f"Ưu điểm: Bạn đã đưa ra phản hồi bước đầu cho câu hỏi '{q_text[:70]}...'. "
                "Điểm cần cải thiện: Câu trả lời còn quá ngắn, chưa phân tích rõ Bối cảnh (Situation), Nhiệm vụ (Task), các bước Hành động cụ thể (Action) và Kết quả định lượng (Result). Hãy mở rộng câu trả lời tối thiểu 4-6 câu theo cấu trúc STAR."
            )
        elif word_count < 40:
            score = round(min(7.8, 6.5 + hit_signals * 0.25 + (0.4 if has_numbers else 0.0)), 1)
            fb = (
                "Ưu điểm: Câu trả lời đi đúng trọng tâm câu hỏi và nêu được hướng giải quyết hợp lý. "
                "Điểm cần cải thiện: Bạn nên làm rõ hơn vai trò cá nhân trong phần Hành động (Action) và bổ sung các con số đo lường cụ thể ở phần Kết quả (Result) như % hiệu suất tăng lên, thời gian tiết kiệm được hoặc mức độ hài lòng của các bên."
            )
        else:
            score = round(min(9.5, 7.6 + hit_signals * 0.22 + (0.5 if has_numbers else 0.0)), 1)
            fb = (
                "Ưu điểm: Câu trả lời rất chi tiết, lập luận chặt chẽ, thể hiện rõ tư duy thực tế và bám sát cấu trúc STAR. "
                "Điểm cần cải thiện: Để câu trả lời đạt mức xuất sắc (9.5 - 10/10) trước hội đồng tuyển dụng, bạn có thể nhấn mạnh thêm bài học kinh nghiệm rút ra và cách chuẩn hóa giải pháp đó thành quy trình chung cho tập thể."
            )

        improved = (
            f"• S (Situation - Tình huống): Trong một dự án/nhiệm vụ thực tế liên quan trực tiếp đến '{q_text[:90]}', nhóm tôi từng đối mặt với yêu cầu khắt khe về cả chất lượng chuyên môn lẫn tiến độ bàn giao.\n"
            f"• T (Task - Nhiệm vụ): Tôi được giao phụ trách chính việc phân tích bài toán, đề xuất phương án tối ưu và đảm bảo đầu ra đạt 100% tiêu chuẩn đúng hạn.\n"
            f"• A (Action - Hành động): Tôi đã chủ động rà soát dữ liệu đầu vào, lập kế hoạch triển khai theo từng mốc ưu tiên, áp dụng công cụ chuyên ngành để kiểm soát chất lượng và phối hợp chặt chẽ với các thành viên để tháo gỡ điểm nghẽn.\n"
            f"• R (Result - Kết quả): Hoàn thành mục tiêu sớm hơn 20% thời gian dự kiến, giảm thiểu tối đa sai sót phát sinh và giải pháp này được ghi nhận làm quy trình tham khảo cho các dự án tiếp theo."
        )
        return json.dumps({
            "evaluation": {
                "score": score,
                "feedback": fb,
                "improved_answer": improved
            }
        }, ensure_ascii=False)

    # 5. Trích xuất JD nâng cao (/jobs/extract-advanced/)
    if '"evidence"' in prompt_lower:
        jd_part = prompt.split("JD:")[-1].strip() if "JD:" in prompt else prompt
        skills = extract_skills_universal_from_text(jd_part, max_skills=8)
        if not skills:
            skills = ["Kỹ năng chuyên môn", "Giải quyết vấn đề", "Giao tiếp & Làm việc nhóm"]
        return json.dumps([
            {"skill": s, "evidence": f"Yêu cầu năng lực '{s}' được đề cập trong Mô tả công việc (JD)."}
            for s in skills
        ], ensure_ascii=False)

    # 6. Trích xuất danh sách kỹ năng từ JD tự do (/analyses/match)
    jd_part = prompt.split("JD:")[-1].strip() if "JD:" in prompt else prompt
    matched = extract_skills_universal_from_text(jd_part, max_skills=10)
    if not matched:
        matched = ["Kỹ năng chuyên môn ngành", "Phân tích & Giải quyết vấn đề", "Giao tiếp & Phối hợp nhóm", "Microsoft Office (Word / Excel / PowerPoint)"]
    return json.dumps(matched, ensure_ascii=False)


def _smart_ollama_chat(*args, **kwargs):
    global _WORKING_OLLAMA_HOST, _LAST_FAILED_PROBE_TS
    import time as _time
    # Tắt chế độ suy nghĩ ngầm (<think>) của Qwen 3.5 để tốc độ trả lời nhanh gấp 10 lần và không bị rỗng content
    kwargs.setdefault("think", False)
    target_model = kwargs.get("model", "qwen3.5:4b")
    messages = kwargs.get("messages", args[1] if len(args) > 1 else [])

    now_ts = _time.time()
    alive_with_model = []
    alive_without_model = []

    if _WORKING_OLLAMA_HOST:
        is_alive, has_model = _probe_ollama_host(_WORKING_OLLAMA_HOST, target_model)
        if is_alive and has_model:
            alive_with_model.append(_WORKING_OLLAMA_HOST)
        else:
            _WORKING_OLLAMA_HOST = None

    if not alive_with_model and (now_ts - _LAST_FAILED_PROBE_TS > 15.0):
        in_docker = os.path.exists("/.dockerenv")
        raw_hosts = [os.getenv("OLLAMA_HOST", "").strip(), "http://127.0.0.1:11434"]
        if in_docker:
            raw_hosts.extend(["http://host.docker.internal:11434", "http://ollama:11434"])
        candidates = []
        for h in raw_hosts:
            if h and h not in candidates:
                candidates.append(h)

        for host in candidates:
            is_alive, has_model = _probe_ollama_host(host, target_model)
            if is_alive:
                if has_model:
                    alive_with_model.append(host)
                    break
                else:
                    alive_without_model.append(host)
        if not alive_with_model:
            _LAST_FAILED_PROBE_TS = now_ts

    # Nếu có host Ollama đang sống nhưng chưa tải xong model qwen3.5:4b (3.3GB), kích hoạt tải ngầm không gây treo web
    for host in alive_without_model:
        threading.Thread(target=_bg_pull_model, args=(host, target_model), daemon=True).start()

    # Nếu đã có host có sẵn model qwen3.5:4b -> Gọi trực tiếp mô hình AI Qwen 3.5:4b
    for host in alive_with_model:
        try:
            client = ollama.Client(host=host, headers={"Host": "localhost:11434"}, timeout=35.0)
            res = client.chat(*args, **kwargs)
            _WORKING_OLLAMA_HOST = host
            return res
        except Exception as e:
            print(f"[Ollama] Lỗi khi gọi model tại {host}: {e}")
            _WORKING_OLLAMA_HOST = None
            _LAST_FAILED_PROBE_TS = now_ts

    # Cơ chế dự phòng thông minh: Khi máy mới tải từ GitHub về đang trong lúc chờ tải 3.3GB model hoặc máy yếu không chạy nổi LLM
    print("[AI Fallback Engine] Sử dụng bộ xử lý AI đa ngành dự phòng thông minh...")
    fallback_content = _build_fallback_ai_content(messages)
    return ollama.ChatResponse(
        model=target_model,
        message=ollama.Message(role="assistant", content=fallback_content)
    )

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

    # 2. Quản lý Chuỗi ngày (Streak)
    current_streak = Column(Integer, default=0)
    last_study_date = Column(String, default="")
    last_watered_date = Column(String, default="")
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
    Base.metadata.create_all(bind=engine)
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

class ScheduleItem(BaseModel):
    id: int
    exactDate: str
    dayOfWeek: str
    timeStart: str
    timeEnd: str

class StudyPlanRequest(BaseModel):
    profile_id: str
    role_id: str
    schedules: List[ScheduleItem]
    gaps: List[str]


def resolve_profile_id(raw_profile_id: int | str | None) -> int:
    """Chuyển đổi mọi dạng profile_id (số hoặc chuỗi như 'khoi', 'linh', 'duc') về ID số nguyên hợp lệ."""
    if raw_profile_id is None:
        return 1
    s = str(raw_profile_id).strip()
    if s.isdigit() and int(s) > 0:
        return int(s)
    sample_map = {"khoi": 1, "linh": 2, "duc": 3}
    return sample_map.get(s.lower(), 1)


def ensure_profile_and_streak(db: Session, raw_profile_id: int | str | None) -> tuple[Profile, StreakAndReport]:
    """
    Đảm bảo luôn tồn tại bản ghi Profile và StreakAndReport (Chậu cây) trong Database.
    Khắc phục triệt để lỗi 404 'Không tìm thấy chậu cây của bạn!' trong mọi trường hợp.
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
                password="123",
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
    try:
        response = ollama.chat(
            model='qwen3.5:4b',
            messages=[
                {'role': 'system', 'content': 'You are a JSON API. Output only valid JSON.'},
                {'role': 'user', 'content': prompt_text}
            ],
            format='json'
        )
        ai_extracted_skills = response['message']['content']
    except Exception:
        fallback_skills = extract_skills_universal_from_text(job.description, max_skills=8) or ["Kỹ năng chuyên môn"]
        ai_extracted_skills = json.dumps(
            [{"skill": s, "evidence": "Trích xuất từ yêu cầu công việc trong JD"} for s in fallback_skills],
            ensure_ascii=False
        )

    db_job = Job(title=job.title, description=job.description, requirements_json=ai_extracted_skills)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@app.post("/profiles/extract-cv/")
def create_profile_from_cv(cv_input: CVInput, db: Session = Depends(get_db)):
    cv_text_short = cv_input.cv_text[:2500]

    prompt_text = f"""Extract candidate info and all professional skills (any industry: IT, Finance, Accounting, Law, F&B, Marketing, HR, Logistics, Engineering, etc.) from the CV text below. Output ONLY a valid JSON object without any explanation.
        CV TEXT:
        {cv_text_short}

        REQUIRED JSON FORMAT:
        {{
            "name": "Candidate Name",
            "email": "email@example.com",
            "skills": {{"Skill 1": 4, "Skill 2": 5, "Skill 3": 4}},
            "experience": "Brief summary of work experience and projects from CV"
        }}
    """

    ai_data = {}
    try:
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
        print(f"--- CÂU TRẢ LỜI GỐC CỦA AI (CV) ---:\n{content}\n-----------------------------")

        if not content:
            raise ValueError("Ollama trả về chuỗi rỗng.")

        json_match = re.search(r'(\{[\s\S]*\})', content)
        cleaned = json_match.group(1) if json_match else content
        ai_data = json.loads(cleaned.strip())

    except Exception as e:
        print(f"--- DÙNG BỘ BÓC TÁCH ĐA NGÀNH CHO CV ---: {str(e)}")
        ai_data = {}

    ai_name = str(ai_data.get("name", "")).strip()
    if not ai_name or ai_name == "Candidate Name":
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

    # Bổ sung thêm các kỹ năng đa ngành quét được từ văn bản CV để không bỏ sót bất kỳ ngành nào
    universal_detected = extract_skills_universal_from_text(cv_input.cv_text, max_skills=10)
    for sk in universal_detected:
        if not any(skills_are_matching(sk, existing_k) for existing_k in final_skills.keys()):
            final_skills[sk] = 4
        if len(final_skills) >= 12:
            break

    if not final_skills:
        final_skills = {"Kỹ năng chuyên môn": 4, "Giao tiếp & Phối hợp": 4, "Làm việc nhóm (Teamwork)": 4}

    ai_exp = str(ai_data.get("experience", "")).strip()
    if not ai_exp or ai_exp == "Chưa có dữ liệu":
        ai_exp = cv_input.cv_text[:800].strip()

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
        Extract professional skills, domain skills, tools, and soft skills from the Job Description (JD) below (can be ANY industry: IT, Finance, Accounting, Law, F&B, Marketing, Sales, HR, Logistics, Engineering, Healthcare, Education, etc.).
        Output ONLY a JSON array of 5 to 8 concise skill names in Vietnamese or standard English terms. Do NOT output anything else.
        Example: ["Kế toán tổng hợp", "Excel nâng cao", "MISA", "Phân tích báo cáo tài chính", "Giao tiếp"]
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
                "reason": f"Yêu cầu mức {int(yc_i)}/5, hồ sơ hiện tại {'chưa ghi nhận kỹ năng này' if sv_i == 0 else f'đang ở mức {int(sv_i)}/5 — cần bổ sung thêm thực hành'}."
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
        fit_verdict = f"Hồ sơ hiện tại đạt {rounded_total}% độ khớp với vị trí '{target_role_display}' — đang có khoảng cách kỹ năng lớn cần được lên lộ trình học bù đắp."

    matched_str = ", ".join(matched_skill_names[:5]) if matched_skill_names else "Chưa có kỹ năng khớp trực tiếp"
    gaps_str = ", ".join(missing_skill_names[:5]) if missing_skill_names else "Không có lỗ hổng kỹ năng lớn"

    ai_reasoning = (
        f"📌 Kết luận tổng quan: {fit_verdict}\n"
        f"• Điểm mạnh hiện có: Đáp ứng {met_count}/{len(jd_skills)} nhóm kỹ năng yêu cầu của JD ({matched_str}) "
        f"với điểm Chuyên môn đạt {round(skill_score)}%, mức độ Yêu thích đạt {round(interest_score)}% và Kinh nghiệm thực tiễn đạt {round(experience_score)}%.\n"
        f"• Trọng tâm cần cải thiện ({gap_count} kỹ năng): {gaps_str}. "
        f"Khuyến nghị bạn chuyển sang bước 'Lộ trình học tập' để hệ thống tự động phân bổ bài học vào khung giờ rảnh và luyện tập trong 'Phòng phỏng vấn STAR'."
    )

    return {
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
# PHẦN 5: API TẠO LỘ TRÌNH HỌC TẬP & BĂM GIỜ THÔNG MINH
# ==========================================
@app.post("/study-plan/generate")
def generate_study_plan(req: StudyPlanRequest, db: Session = Depends(get_db)):
    try:
        profile, streak_record = ensure_profile_and_streak(db, req.profile_id)
        target_pid = profile.id

        missing_skills = req.gaps if req.gaps and len(req.gaps) > 0 else ["Kỹ năng chuyên ngành"]
        gaps_count = len(missing_skills)

        prompt_text = f"""
        Lên lộ trình học tập cá nhân hóa để khắc phục ĐẦY ĐỦ {gaps_count} kỹ năng bị hổng sau: {", ".join(missing_skills)}.
        
        QUY TẮC BẮT BUỘC:
        1. Sáng tạo TỐI THIỂU {gaps_count} bài học. Mỗi kỹ năng hổng phải có ít nhất 1 bài học chi tiết, thực tế.
        2. CHỈ trả về JSON hợp lệ, KHÔNG kèm văn bản giải thích.
        3. Định dạng chuẩn:
        {{
            "tasks": [
                {{"title": "Tên bài học cụ thể", "duration_minutes": 45}},
                {{"title": "Thực hành bài tập ứng dụng", "duration_minutes": 60}}
            ]
        }}
        """

        max_retries = 2
        ai_tasks = []

        for attempt in range(max_retries):
            print(f"--- ĐANG GỌI AI TẠO LỘ TRÌNH (LẦN THỬ {attempt + 1}/{max_retries}) ---")
            try:
                response = ollama.chat(
                    model='qwen3.5:4b',
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
                ai_tasks = ai_data.get("tasks", [])

                if len(ai_tasks) >= gaps_count:
                    print(f"AI ĐÃ TẠO THÀNH CÔNG {len(ai_tasks)} BÀI HỌC CHO {gaps_count} KỸ NĂNG!")
                    break
            except Exception as e:
                print(f"Lỗi tạo lộ trình lần {attempt + 1}: {e}")

        if len(ai_tasks) < gaps_count:
            for i in range(len(ai_tasks), gaps_count):
                skill_gap = missing_skills[i % len(missing_skills)]
                ai_tasks.append({"title": f"Nền tảng & Lý thuyết trọng tâm: {skill_gap}", "duration_minutes": 45})
                ai_tasks.append({"title": f"Thực hành tình huống thực tế: {skill_gap}", "duration_minutes": 60})

        # BƯỚC 2: PYTHON BĂM GIỜ THEO KHUNG GIỜ RẢNH
        schedules = req.schedules if req.schedules else []
        schedules.sort(key=lambda x: datetime.strptime(f"{x.exactDate} {x.timeStart}", "%d/%m/%Y %H:%M"))

        final_db_tasks = []
        current_schedule_idx = 0

        def get_slot_info(idx):
            if idx >= len(schedules):
                return None, None, 0
            slot = schedules[idx]
            start = datetime.strptime(f"{slot.exactDate} {slot.timeStart}", "%d/%m/%Y %H:%M")
            end = datetime.strptime(f"{slot.exactDate} {slot.timeEnd}", "%d/%m/%Y %H:%M")
            if end <= start:
                end = start + timedelta(minutes=60)
            return start, end, max(15, int((end - start).total_seconds() / 60))

        current_start, current_end, slot_remaining = get_slot_info(0)

        for task in ai_tasks:
            task_title = task.get("title", "Bài học chuyên môn")
            try:
                task_remaining = max(15, int(task.get("duration_minutes", 45) or 45))
            except Exception:
                task_remaining = 45
            part = 1

            while task_remaining > 0:
                while slot_remaining <= 0 and current_schedule_idx < len(schedules):
                    current_schedule_idx += 1
                    current_start, current_end, slot_remaining = get_slot_info(current_schedule_idx)

                if current_schedule_idx < len(schedules):
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

        if final_db_tasks:
            db.query(StudyTask).filter(StudyTask.profile_id == target_pid).delete()
            db.add_all(final_db_tasks)
            streak_record.planned_tasks_weekly = sum(1 for t in final_db_tasks if t.status != "unscheduled")
            streak_record.total_roadmap_minutes = sum(t.duration_minutes for t in final_db_tasks)
            streak_record.completed_roadmap_minutes = 0
            streak_record.completed_tasks_weekly = 0
            streak_record.discipline_score = 0.0
            db.commit()
            for t in final_db_tasks:
                db.refresh(t)

        return {
            "message": "Tạo lộ trình và phân bổ lịch thành công",
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
# PHẦN 7: ĐĂNG KÝ & ĐĂNG NHẬP
# ==========================================
@app.post("/auth/register")
def register_user(data: RegisterInput, db: Session = Depends(get_db)):
    existing = db.query(Profile).filter(Profile.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")

    new_user = Profile(
        name=data.name, email=data.email, password=data.password,
        skills_json="{}", interests_json="[]", experience_text="", free_time_json="[]"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    ensure_profile_and_streak(db, new_user.id)

    return {"message": "Đăng ký thành công!", "profile_id": new_user.id, "name": new_user.name, "email": new_user.email}


@app.post("/auth/login")
def login_user(data: LoginInput, db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.email == data.email, Profile.password == data.password).first()
    if not user:
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác!")

    ensure_profile_and_streak(db, user.id)

    return {"message": "Đăng nhập thành công!", "profile_id": user.id, "name": user.name, "email": user.email}


# ==========================================
# PHẦN 8: HOÀN THÀNH BÀI HỌC, TƯỚI CÂY & GAMIFICATION (MÚI GIỜ VN UTC+7)
# ==========================================
@app.post("/study-plan/complete-task")
def complete_study_task(data: TaskCompleteInput, db: Session = Depends(get_db)):
    task = db.query(StudyTask).filter(StudyTask.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

    if task.status == "completed":
        raise HTTPException(status_code=400, detail="Bài học này đã được hoàn thành trước đó!")

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

    # 1. Cập nhật Chuỗi ngày học (Streak) theo ngày Việt Nam
    today = now_vn.date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    if record.last_study_date == yesterday_str:
        record.current_streak += 1
    elif record.last_study_date != today_str:
        record.current_streak = max(1, record.current_streak) if record.current_streak > 0 and record.last_study_date == today_str else 1
    record.last_study_date = today_str

    # 2. Cộng XP
    xp_reward = 50
    record.current_xp += xp_reward
    record.weekly_xp += xp_reward

    # 3. Tính tiến độ dựa trên tổng số Task của lộ trình (0% -> 100%)
    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == profile_id).order_by(StudyTask.id.asc()).all()
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")

    progress_percent = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0

    if progress_percent == 0:
        current_stage = "Hạt giống"
    elif progress_percent < 25:
        current_stage = "Nảy mầm"
    elif progress_percent < 50:
        current_stage = "Phát triển thân"
    elif progress_percent < 75:
        current_stage = "Phân cành"
    elif progress_percent < 100:
        current_stage = "Ra lá"
    else:
        current_stage = "Kết trái"

    record.seed_stage = current_stage

    # 4. Tính thời gian học (Phút)
    total_mins = sum(t.duration_minutes for t in all_tasks)
    completed_mins = sum(t.duration_minutes for t in all_tasks if t.status == "completed")
    record.total_roadmap_minutes = total_mins
    record.completed_roadmap_minutes = completed_mins

    # 5. Tính Chỉ số Kỷ luật tuần (%)
    record.completed_tasks_weekly = completed_tasks
    planned = record.planned_tasks_weekly if record.planned_tasks_weekly > 0 else total_tasks
    if planned > 0:
        record.discipline_score = min(100.0, round((completed_tasks / planned) * 100, 1))
    else:
        record.discipline_score = 100.0 if total_tasks > 0 else 0.0

    db.commit()

    return {
        "message": "Hoàn thành bài học thành công!",
        "added_xp": xp_reward,
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "current_streak": record.current_streak,
        "progress_percent": round(progress_percent, 1),
        "completed_roadmap_minutes": completed_mins,
        "total_roadmap_minutes": total_mins,
        "discipline_score": record.discipline_score,
        "current_seed_stage": current_stage
    }


@app.get("/gamification/{profile_id}")
def get_gamification_data(profile_id: str, db: Session = Depends(get_db)):
    profile, record = ensure_profile_and_streak(db, profile_id)
    pid = profile.id

    today_str = vn_now().strftime("%Y-%m-%d")
    has_watered = (record.last_watered_date == today_str)

    all_tasks = db.query(StudyTask).filter(StudyTask.profile_id == pid).order_by(StudyTask.id.asc()).all()
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")
    progress_percent = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0

    total_mins = sum(t.duration_minutes for t in all_tasks)
    completed_mins = sum(t.duration_minutes for t in all_tasks if t.status == "completed")

    registered_weekdays = []
    for t in all_tasks:
        if t.scheduled_day and t.scheduled_day != "Chờ xếp lịch":
            try:
                task_date = datetime.strptime(t.scheduled_day, "%d/%m/%Y")
                iso_wd = task_date.isoweekday()
                if iso_wd not in registered_weekdays:
                    registered_weekdays.append(iso_wd)
            except ValueError:
                pass

    return {
        "current_streak": record.current_streak,
        "seed_stage": record.seed_stage,
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "has_watered_today": has_watered,
        "completed_roadmap_minutes": completed_mins,
        "total_roadmap_minutes": total_mins,
        "discipline_score": record.discipline_score,
        "progress_percent": round(progress_percent, 1),
        "completed_tasks": completed_tasks,
        "registered_weekdays": registered_weekdays
    }


@app.post("/gamification/water-plant/{profile_id}")
def water_plant(profile_id: str, db: Session = Depends(get_db)):
    _, record = ensure_profile_and_streak(db, profile_id)

    today_str = vn_now().strftime("%Y-%m-%d")
    if record.last_watered_date == today_str:
        raise HTTPException(status_code=400, detail="Hôm nay bạn đã tưới nước rồi! Hãy quay lại vào ngày mai nhé.")

    record.last_watered_date = today_str
    record.current_xp += 25
    record.weekly_xp += 25
    db.commit()

    return {
        "message": "Tưới nước thành công! +25 XP",
        "current_xp": record.current_xp,
        "weekly_xp": record.weekly_xp,
        "seed_stage": record.seed_stage
    }


# ==========================================
# PHẦN 9: PHỎNG VẤN AI NGẪU NHIÊN MỖI VÒNG & CHẤM ĐIỂM STAR
# ==========================================
@app.post("/interview/generate")
async def generate_interview_questions(payload: InterviewRequest):
    persona = payload.persona or "tech_lead"
    level = payload.level or "mid"
    language = payload.language or "vi"
    context = payload.analysis_context if (payload.analysis_context and isinstance(payload.analysis_context, dict)) else {}

    role_id = str(context.get("role_id", "")).strip()
    role_title_map = {
        "backend-php": "Kỹ sư Backend PHP / Laravel",
        "fullstack-laravel-tailwind": "Kỹ sư Fullstack Web (Laravel + Tailwind CSS)",
        "financial-analyst": "Chuyên viên Phân tích Tài chính",
        "general-accountant": "Kế toán tổng hợp",
        "corporate-legal-officer": "Chuyên viên Pháp chế doanh nghiệp",
        "legal-assistant": "Trợ lý Luật sư (Luật Kinh tế)"
    }
    target_role = (
        context.get("target_role")
        or context.get("role_title")
        or context.get("job_title")
        or role_title_map.get(role_id)
        or "Chuyên viên chuyên môn"
    )

    # Lấy danh sách kỹ năng hiện có và kỹ năng còn thiếu từ kết quả phân tích
    raw_skills = context.get("matched_skills") or context.get("skills") or []
    if not raw_skills and isinstance(context.get("radar_data"), dict):
        raw_skills = [k for k, v in context["radar_data"].items() if v and float(v) >= 50]
    candidate_skills = [str(s) for s in raw_skills[:5]] if isinstance(raw_skills, list) else [str(raw_skills)]

    raw_gaps = context.get("missing_skills") or context.get("gaps") or []
    if not raw_gaps and isinstance(context.get("gap_details"), list):
        raw_gaps = [g.get("name") for g in context["gap_details"] if isinstance(g, dict) and g.get("name")]
    gaps = [str(g) for g in raw_gaps[:4]] if isinstance(raw_gaps, list) else [str(raw_gaps)]

    # Chọn ngẫu nhiên chủ đề phụ cho mỗi lần bấm để AI sinh câu hỏi mới hoàn toàn ở mỗi vòng
    rng = random.SystemRandom()
    focus_angles = [
        "Tối ưu hóa quy trình và xử lý điểm nghẽn thực tế",
        "Kiểm soát chất lượng đầu ra và phòng ngừa rủi ro sai sót",
        "Giải quyết sự cố khẩn cấp khi thời hạn (deadline) cận kề",
        "Ra quyết định dựa trên dữ liệu và số liệu đo lường",
        "Thích nghi nhanh với công cụ/nghiệp vụ mới trong dự án",
        "Phối hợp liên phòng ban và thuyết phục các bên liên quan",
        "Xử lý bất đồng quan điểm chuyên môn trong nhóm",
        "Cân bằng giữa tốc độ hoàn thành và độ chính xác tiêu chuẩn"
    ]
    chosen_angles = rng.sample(focus_angles, 3)
    nonce_val = payload.random_nonce or rng.randint(100000, 999999)

    prompt = f"""[HỆ THỐNG]: Bạn là một chuyên gia tuyển dụng AI (Mã phiên ngẫu nhiên: #{nonce_val}). BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm văn bản giải thích.
YÊU CẦU TỐI THƯỢNG: BẠN PHẢI TẠO RA ĐÚNG 3 CÂU HỎI KHÁC NHAU, MỚI MẺ, BÁM SÁT GÓC ĐỘ ĐƯỢC CHỈ ĐỊNH DƯỚI ĐÂY:
- Góc độ câu 1 (Chuyên môn): {chosen_angles[0]}
- Góc độ câu 2 (Tình huống): {chosen_angles[1]}
- Góc độ câu 3 (Kỹ năng mềm): {chosen_angles[2]}

[THÔNG TIN ĐẦU VÀO]:
- Vị trí: {target_role}
- Cấp độ: {level}
- Phong cách người phỏng vấn: {persona}
- Kỹ năng: {candidate_skills}
- Cần cải thiện: {gaps}

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

    try:
        print(f"--- Đang tạo bộ câu hỏi phỏng vấn ngẫu nhiên (#{nonce_val}) cho vị trí: {target_role} ---")
        response = ollama.chat(
            model='qwen3.5:4b',
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
            raise ValueError("Nội dung trả về rỗng.")

        json_match = re.search(r'(\{[\s\S]*\})', content)
        if not json_match:
            raise ValueError("Không tìm thấy khối JSON hợp lệ.")

        content = re.sub(r',\s*([\]}])', r'\1', json_match.group(1))
        ai_output = json.loads(content)
        questions = ai_output.get("questions", [])
        if not isinstance(questions, list) or len(questions) < 3:
            raise ValueError("Số lượng câu hỏi chưa đủ 3 câu.")
        return {"questions": questions[:3]}

    except Exception as e:
        print(f"[Interview Fallback] Sinh bộ câu hỏi ngẫu nhiên từ ngân hàng đa chiều: {e}")
        return {
            "questions": generate_randomized_interview_questions(
                target_role=target_role,
                level=level,
                candidate_skills=candidate_skills,
                gaps=gaps,
                persona=persona
            )
        }


@app.post("/interview/submit-and-evaluate/{question_id}")
async def evaluate_answer(question_id: int, payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    prompt = f"""[HỆ THỐNG]: Bạn là một giám khảo phỏng vấn nhân sự khó tính nhưng công tâm. 
Nhiệm vụ của bạn là chấm điểm câu trả lời của ứng viên dựa trên câu hỏi phỏng vấn.
BẮT BUỘC phải trả về đúng định dạng JSON thuần túy, không kèm theo văn bản giải thích.

[THÔNG TIN ĐẦU VÀO]:
- Câu hỏi phỏng vấn: {payload.question_text}
- Câu trả lời của ứng viên: {payload.student_answer}

[CẤU TRÚC JSON BẮT BUỘC]:
{{
"evaluation": {{
    "score": <Chấm điểm số thực từ 1.0 đến 10.0 dựa trên độ chi tiết, tính thực tế và cấu trúc STAR>,
    "feedback": "Nhận xét chi tiết: Điểm tốt là gì? Cần cải thiện điều gì?",
    "improved_answer": "Viết lại một câu trả lời mẫu xuất sắc hơn theo chuẩn STAR (Situation - Task - Action - Result)"
}}
}}"""

    print(f"--- Đang chấm điểm câu hỏi ID: {question_id} ---")
    try:
        response = ollama.chat(
            model='qwen3.5:4b',
            messages=[{'role': 'user', 'content': prompt}],
            options={'temperature': 0.3, 'num_predict': 2000}
        )
        content = getattr(response.message, 'content', '') if hasattr(response, 'message') else response.get('message', {}).get('content', '')
        json_match = re.search(r'(\{[\s\S]*\})', content)
        if not json_match:
            raise ValueError("Không tìm thấy JSON.")
        ai_output = json.loads(re.sub(r',\s*([\]}])', r'\1', json_match.group(1)))
    except Exception as e:
        print(f"[Evaluate Fallback] Chấm điểm bằng bộ đánh giá STAR dự phòng: {e}")
        ai_output = json.loads(_build_fallback_ai_content([{'role': 'user', 'content': prompt}]))

    eval_obj = ai_output.get("evaluation", {})
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
    db.commit()

    new_interview = Interview(
        profile_id=profile.id,
        student_answer_text=payload.student_answer,
        evaluation_json=json.dumps({"evaluation": eval_obj}, ensure_ascii=False)
    )
    db.add(new_interview)
    db.commit()

    return {
        "evaluation": eval_obj,
        "added_xp": xp_reward,
        "current_xp": streak_record.current_xp,
        "weekly_xp": streak_record.weekly_xp
    }
