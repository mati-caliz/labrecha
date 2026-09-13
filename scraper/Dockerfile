FROM python:3.12-slim

# La imagen oficial sale con paquetes de Debian atrasados (perl-base con CVE crítica).
RUN apt-get update \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*

LABEL keep=true

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY shared ./shared
RUN pip install "./shared[migrations]"

COPY scraper/pyproject.toml ./
COPY scraper/labrecha_scraper ./labrecha_scraper

RUN pip install .

ENTRYPOINT ["labrecha-scraper"]
CMD ["run", "all"]
