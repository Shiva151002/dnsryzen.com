import dns.resolver
import dns.reversename   # ✅ NEW IMPORT FOR PTR SUPPORT
import requests
import concurrent.futures
from functools import lru_cache
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Full list of supported types for Root Domain
ALL_RECORD_TYPES = [
    "A", "AAAA", "MX", "NS", "TXT", "SOA",
    "CNAME", "PTR",  # ✅ ADDED PTR SUPPORT
    "DMARC", "SPF", "BIMI"
]


# Extensive list of common subdomains to scan (Discovery)
COMMON_SUBDOMAINS = [
    "www","mail","remote","blog","webmail","server","ns1","ns2",
    "smtp","secure","vpn","m","shop","ftp","mail2","test",
    "portal","ns","ww1","host","support","dev","web","admin",
    "api","app","staging","ads","aws","beta","board","brand",
    "broadcast","build","business","card","catalog","certificate",
    "chat","checkout","cloud","code","commerce","community",
    "conference","connect","console","control","cpanel","dashboard",
    "data","db","design","developer","developers","dl","docs",
    "download","drive","email","en","exchange","files","forum",
    "games","git","go","help","home","hr","hub","identity",
    "images","imap","infra","infrastructure","insights","ipv6","is",
    "issues","it","key","knowledge","lab","labs","learn","legal",
    "link","login","manage","marketing","media","member","mobile",
    "monitor","music","my","network","news","notifications","one",
    "online","oracle","orders","p","panel","password","paste","pay",
    "payment","payments","photo","photos","pki","play","policy",
    "pop","privacy","prod","project","promo","pub","public","r",
    "read","realtime","recruit","register","relay","report","research",
    "rewrite","root","rss","s1","sales","search","security",
    "service","services","share","shopping","site","sitemap","sky",
    "soap","social","sonar","source","stat","static","stats",
    "status","store","storefront","studio","supply","talk","target",
    "toolbar","tools","track","translate","transparency","updates",
    "video","videos","vm","vote","w","watch","webservices","wiki",
    "ws","xml","y","z"
]


# Setup a robust session with retries for network stability
def create_session():
    session = requests.Session()
    retry = Retry(connect=3, backoff_factor=0.5)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session


request_session = create_session()


@lru_cache(maxsize=1024)
def get_ip_details(ip):
    """
    Fetches ISP/Organization info for an IP address with caching.
    """
    try:
        response = request_session.get(
            f"http://ip-api.com/json/{ip}?fields=org,isp,as",
            timeout=1.0
        )

        if response.status_code == 200:
            data = response.json()

            org = data.get('org', '')
            isp = data.get('isp', '')
            asn_info = data.get('as', '')

            provider_name = org if org else isp
            asn = asn_info.split(' ')[0] if asn_info else ""

            if provider_name and asn:
                return f"{provider_name} ({asn})"

            return provider_name or asn_info

    except Exception:
        return None

    return None


def resolve_single_record(domain, r_type):
    """
    Helper to resolve a single type for a domain
    """

    results = []

    try:

        q_domain = domain
        q_type = r_type


        # =========================
        # PTR SUPPORT (NEW)
        # =========================
        if r_type == "PTR":

            q_domain = dns.reversename.from_address(domain)
            q_type = "PTR"


        # =========================
        # PSEUDO RECORD HANDLING
        # =========================
        elif r_type == "DMARC":

            q_domain = f"_dmarc.{domain}"
            q_type = "TXT"


        elif r_type == "BIMI":

            q_domain = f"default._bimi.{domain}"
            q_type = "TXT"


        elif r_type == "SPF":

            q_type = "TXT"


        # =========================
        # DNS QUERY
        # =========================
        answers = dns.resolver.resolve(q_domain, q_type, lifetime=2.0)


        for rdata in answers:

            # PTR returns differently formatted object
            if r_type == "PTR":

                txt_content = str(rdata.target).rstrip(".")


            else:

                txt_content = rdata.to_text()


            # =========================
            # FILTER VALID RECORD TYPES
            # =========================
            if r_type == "DMARC" and "v=DMARC" not in txt_content:
                continue


            if r_type == "BIMI" and "v=BIMI" not in txt_content:
                continue


            if r_type == "SPF" and "v=spf1" not in txt_content:
                continue


            record_entry = {

                "name": str(q_domain),
                "type": r_type,
                "ttl": answers.ttl,
                "data": txt_content

            }


            # =========================
            # PROVIDER ENRICHMENT
            # =========================
            if r_type == "A":

                provider = get_ip_details(txt_content)

                if provider:

                    record_entry['provider'] = provider


            results.append(record_entry)


    except Exception:

        pass


    return results


def get_dns_records(domain, record_type="A"):

    return resolve_single_record(domain, record_type)


def get_full_report(domain):
    """
    Scans ALL types for the root domain AND common subdomains.
    """

    report_data = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:

        futures = []

        # ROOT DOMAIN RECORDS
        for r_type in ALL_RECORD_TYPES:

            futures.append(

                executor.submit(resolve_single_record, domain, r_type)

            )


        # SUBDOMAIN DISCOVERY
        for sub in COMMON_SUBDOMAINS:

            sub_domain = f"{sub}.{domain}"

            futures.append(

                executor.submit(resolve_single_record, sub_domain, "A")

            )

            futures.append(

                executor.submit(resolve_single_record, sub_domain, "CNAME")

            )


        for future in concurrent.futures.as_completed(futures):

            data = future.result()

            if data:

                report_data.extend(data)


    return report_data


# =========================
# EMAIL HEALTH CHECK
# =========================
def check_email_health(domain, selector=None):

    results = {

        "spf": {

            "status": "fail",

            "record": None,

            "message": "No SPF record found."

        },

        "dmarc": {

            "status": "fail",

            "record": None,

            "message": "No DMARC record found."

        },

        "dkim": {

            "status": "info",

            "record": None,

            "message": "Selector required to check DKIM."

        }

    }


    # SPF CHECK
    spf_records = resolve_single_record(domain, "SPF")

    if spf_records:

        results["spf"] = {

            "status": "pass",

            "record": spf_records[0]['data'],

            "message": "SPF record found."

        }


    # DMARC CHECK
    dmarc_records = resolve_single_record(domain, "DMARC")

    if dmarc_records:

        results["dmarc"] = {

            "status": "pass",

            "record": dmarc_records[0]['data'],

            "message": "DMARC record found."

        }


    # DKIM CHECK
    if selector:

        try:

            dkim_domain = f"{selector}._domainkey.{domain}"

            dkim_records = resolve_single_record(dkim_domain, "TXT")

            found = False

            for r in dkim_records:

                if "v=DKIM1" in r['data'] or "k=rsa" in r['data']:

                    results["dkim"] = {

                        "status": "pass",

                        "record": r['data'],

                        "message": f"DKIM record found for selector '{selector}'."

                    }

                    found = True

                    break


            if not found:

                results["dkim"] = {

                    "status": "fail",

                    "record": None,

                    "message": f"No DKIM record found for selector '{selector}'."

                }


        except:

            results["dkim"]["status"] = "fail"

            results["dkim"]["message"] = "Error checking DKIM."


    return results
