import os
import ssl
import socket
import logging
import requests
import base64
import ipaddress
from urllib.parse import urlparse, urlunparse
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Header, HTTPException, Query, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv # NEW: Import load_dotenv

# NEW: Force load the .env file
load_dotenv()

from app.dns_resolver import get_dns_records, get_full_report, check_email_health

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
#                       MODELS
# ============================================================

class DomainRequest(BaseModel):
    domain: str
    record_type: str = "A"

class EmailHealthRequest(BaseModel):
    domain: str
    selector: Optional[str] = None

class RedirectionRequest(BaseModel):
    url: str

class SSLCheckRequest(BaseModel):
    domain: str

class IpRequest(BaseModel):
    ip: Optional[str] = None

class ThreatIntelRequest(BaseModel): 
    target: str


# ============================================================
#                       ROOT
# ============================================================

@app.get("/")
def read_root():
    return {"status": "healthy"}


# ============================================================
#                  IP INTELLIGENCE (FIXED)
# ============================================================

@app.post("/api/ip-info")
def get_ip_info(request: Request, body: IpRequest):
    target_ip = body.ip

    # Automatic IP Detection Logic
    if not target_ip:
        cf_ip = request.headers.get("CF-Connecting-IP")
        real_ip = request.headers.get("X-Real-IP")
        forwarded = request.headers.get("X-Forwarded-For")

        if cf_ip:
            target_ip = cf_ip
        elif real_ip:
            target_ip = real_ip
        elif forwarded:
            target_ip = forwarded.split(",")[0].strip()
        else:
            target_ip = request.client.host

    try:
        response = requests.get(f"http://ipwho.is/{target_ip}", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"success": False, "message": "External IP provider failed"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ============================================================
#                   DNS ANALYZE
# ============================================================

@app.post("/api/analyze")
def analyze_domain(request: DomainRequest, x_grok_api_key: Optional[str] = Header(None)):
    domain = request.domain
    r_type = request.record_type
    records = get_dns_records(domain, r_type)

    api_key = x_grok_api_key or os.getenv("GROK_API_KEY")
    ai_analysis = ""

    if not api_key:
        ai_analysis = "⚠️ AI Analysis Unavailable: No API Key provided."
    else:
        try:
            client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
            if records:
                summary = "\n".join([f"{r['type']}: {r['data']}" for r in records[:20]])
                prompt = f"Analyze {r_type} records for {domain}:\n{summary}\n\nAssessment:"
            else:
                prompt = f"No {r_type} records found for {domain}."

            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}]
            )
            ai_analysis = completion.choices[0].message.content
        except Exception as e:
            ai_analysis = f"⚠️ AI Error: {str(e)}"

    return {"domain": domain, "record_type": r_type, "records": records, "ai_analysis": ai_analysis}


# ============================================================
#                   DOMAIN REPORT
# ============================================================

@app.post("/api/report")
def generate_report(request: DomainRequest):
    domain = request.domain
    all_records = get_full_report(domain)

    grouped = {}
    for r in all_records:
        rtype = r['type']
        if "v=DMARC" in r['data']: rtype = "DMARC"
        if "v=spf1" in r['data']: rtype = "SPF"
        if "v=BIMI" in r['data']: rtype = "BIMI"

        if rtype not in grouped:
            grouped[rtype] = []
        grouped[rtype].append(r)

    sorted_grouped = {k: grouped[k] for k in sorted(grouped.keys())}

    return {
        "domain": domain,
        "report": sorted_grouped,
        "total_records": len(all_records)
    }


# ============================================================
#                   EMAIL HEALTH
# ============================================================

@app.post("/api/email-health")
def email_health(request: EmailHealthRequest):
    return check_email_health(request.domain, request.selector)


# ============================================================
#                   REDIRECTION CHECK
# ============================================================

@app.post("/api/redirections")
def find_redirections(request: RedirectionRequest):
    url = request.url

    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url

    try:
        session = requests.Session()
        response = session.get(url, allow_redirects=True, timeout=10)

        history = []

        for resp in response.history:
            history.append({
                "url": resp.url,
                "status_code": resp.status_code,
                "final_url": resp.headers.get('Location', resp.url)
            })

        history.append({
            "url": response.url,
            "status_code": response.status_code,
            "final_url": response.url
        })

        return {"success": True, "url": url, "hops": history}

    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "url": url,
            "error": str(e),
            "hops": [{"url": url, "status_code": 0, "final_url": str(e), "error": True}]
        }


# ============================================================
#                   SSL CHECK
# ============================================================

def get_cert_chain(domain):
    ctx = ssl.create_default_context()
    sock = socket.create_connection((domain, 443), timeout=5)
    sslsock = ctx.wrap_socket(sock, server_hostname=domain)

    der_cert = sslsock.getpeercert(True)
    pem_cert = ssl.DER_cert_to_PEM_cert(der_cert)
    cert = x509.load_pem_x509_certificate(pem_cert.encode(), default_backend())

    chain = [parse_cert(cert)]
    return chain

def _is_public_hostname(hostname: str) -> bool:
    try:
        addrinfos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False

    for info in addrinfos:
        ip_str = info[4][0]
        ip_obj = ipaddress.ip_address(ip_str)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            return False
    return True

def _normalize_and_validate_external_url(raw_url: str) -> str:
    url = raw_url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")
    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL")
    if not _is_public_hostname(parsed.hostname):
        raise HTTPException(status_code=400, detail="URL resolves to a non-public address")

    return urlunparse(parsed)

def parse_cert(cert):
    cn = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
    issuer = cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
    days_left = (cert.not_valid_after - datetime.utcnow()).days

    return {
        "cn": cn,
        "issuer": issuer,
        "not_before": cert.not_valid_before.strftime("%b %d %H:%M:%S %Y GMT"),
        "not_after": cert.not_valid_after.strftime("%b %d %H:%M:%S %Y GMT"),
        "validity_days": days_left,
        "serial": hex(cert.serial_number)[2:]
    }

@app.post("/api/ssl-check")
def ssl_check(request: SSLCheckRequest):
    domain = request.domain.strip().lower()
    domain = domain.replace("https://", "").replace("http://", "").replace("/", "")

    chain = get_cert_chain(domain)
    return {"domain": domain, "server_certificate": chain[0]}


# ============================================================
#                HTTP HEADERS (NEW TOOL)
# ============================================================

@app.post("/api/http-headers")
def get_http_headers(request: RedirectionRequest):
    try:
        url = _normalize_and_validate_external_url(request.url)

        # Use HEAD request to get headers without downloading body
        # Redirects are disabled to prevent SSRF bypass via open redirects.
        response = requests.head(url, timeout=5, allow_redirects=False)

        # Analyze security headers
        headers = dict(response.headers)
        security_report = {
            "Strict-Transport-Security": "Missing",
            "Content-Security-Policy": "Missing",
            "X-Frame-Options": "Missing",
            "X-Content-Type-Options": "Missing",
            "Referrer-Policy": "Missing",
            "Permissions-Policy": "Missing"
        }

        score = 0
        total_checks = len(security_report)

        for key in security_report.keys():
            # Case-insensitive header check
            header_val = next((v for k, v in headers.items() if k.lower() == key.lower()), None)
            if header_val:
                security_report[key] = "Present"
                score += 1

        grade = "F"
        if score == total_checks: grade = "A+"
        elif score >= total_checks - 1: grade = "A"
        elif score >= total_checks - 2: grade = "B"
        elif score >= total_checks - 3: grade = "C"
        elif score >= 1: grade = "D"

        return {
            "success": True,
            "status_code": response.status_code,
            "headers": headers,
            "security_report": security_report,
            "grade": grade
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================
#               THREAT INTELLIGENCE (VIRUSTOTAL)
# ============================================================

def get_vt_headers():
    vt_key = os.getenv("VT_API_KEY")
    if not vt_key:
        return None # Return None instead of throwing a 500 error
    return {
        "accept": "application/json",
        "x-apikey": vt_key
    }

@app.post("/api/threat-intel/search")
def threat_intel_search(request: ThreatIntelRequest):
    headers = get_vt_headers()
    if not headers:
        return {"success": False, "message": "Backend Configuration Error: VT_API_KEY is missing from the .env file."}

    target = request.target.strip()
    try:
        url = f"https://www.virustotal.com/api/v3/search?query={target}"
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        return {"success": False, "message": f"VirusTotal Error: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}


@app.post("/api/threat-intel/url")
def threat_intel_url(request: ThreatIntelRequest):
    headers = get_vt_headers()
    if not headers:
        return {"success": False, "message": "Backend Configuration Error: VT_API_KEY is missing from the .env file."}

    target_url = request.target.strip()
    url_id = base64.urlsafe_b64encode(target_url.encode()).decode().strip("=")

    try:
        response = requests.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {"success": True, "type": "report", "data": response.json()}
        elif response.status_code == 404:
            scan_res = requests.post("https://www.virustotal.com/api/v3/urls", headers=headers, data={"url": target_url})
            if scan_res.status_code == 200:
                return {"success": True, "type": "analysis", "data": scan_res.json()}
            return {"success": False, "message": f"Scan Request Failed: {scan_res.status_code}"}

        return {"success": False, "message": f"VirusTotal Error: {response.status_code}"}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}


@app.post("/api/threat-intel/file")
async def threat_intel_file(file: UploadFile = File(...)):
    headers = get_vt_headers()
    if not headers:
        return {"success": False, "message": "Backend Configuration Error: VT_API_KEY is missing from the .env file."}
    
    try:
        file_content = await file.read()
        files = {"file": (file.filename, file_content, file.content_type)}
        response = requests.post("https://www.virustotal.com/api/v3/files", headers=headers, files=files, timeout=30)
        
        if response.status_code == 200:
            return {"success": True, "type": "analysis", "data": response.json()}
        return {"success": False, "message": f"File Upload Error: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}


@app.get("/api/threat-intel/analysis/{analysis_id}")
def threat_intel_analysis(analysis_id: str):
    headers = get_vt_headers()
    if not headers:
        return {"success": False, "message": "Backend Configuration Error: VT_API_KEY is missing from the .env file."}
        
    try:
        response = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        return {"success": False, "message": f"Analysis lookup failed: {response.status_code}"}
    except Exception as e:
        return {"success": False, "message": str(e)}
