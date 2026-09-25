from __future__ import annotations

from typing import Any

import httpx

CKAN_PACKAGE_URL = "https://datos.hcdn.gob.ar/api/3/action/package_show"
# El CKAN de HCDN tarda entre 10 y 20 s en contestar el package_show y a veces devuelve 503
# por varios minutos: con el timeout global de 30 s la metadata tumbaba el conector entero.
CKAN_METADATA_TIMEOUT_SECONDS = 120.0
LARGE_DOWNLOAD_TIMEOUT_SECONDS = 300.0


def fetch_package_resources(client: httpx.Client, dataset_id: str) -> list[dict[str, Any]]:
    response = client.get(
        CKAN_PACKAGE_URL, params={"id": dataset_id}, timeout=CKAN_METADATA_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    resources: list[dict[str, Any]] = response.json()["result"]["resources"]
    return resources


def find_resource_url(
    resources: list[dict[str, Any]], dataset_id: str, resource_format: str
) -> str:
    for resource in resources:
        if (resource.get("format") or "").upper() == resource_format and resource.get("url"):
            return str(resource["url"])
    raise ValueError(f"no se encontró recurso {resource_format} en el dataset {dataset_id}")
