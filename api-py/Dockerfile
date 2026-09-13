FROM python:3.12-slim

# La imagen oficial sale con paquetes de Debian atrasados (perl-base con CVE crítica).
RUN apt-get update \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY shared ./shared
RUN pip install ./shared

COPY api-py/pyproject.toml ./
COPY api-py/labrecha_api ./labrecha_api

RUN pip install .

EXPOSE 8000

CMD ["uvicorn", "labrecha_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
