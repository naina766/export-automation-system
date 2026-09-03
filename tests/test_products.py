import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from products.catalog import ProductCatalog

client = TestClient(app)

def test_list_products():
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert "active_product" in data
    assert len(data["products"]) >= 5
    
    # Check that Himalayan Sound Healing Bowls is in seed
    names = [p["name"] for p in data["products"]]
    assert "Himalayan Sound Healing Bowls" in names
    assert "Tibetan Singing Bowls" in names
    assert "Crystal Singing Bowls" in names

def test_product_crud_lifecycle():
    # 1. Create a product
    new_prod_payload = {
        "name": "Nepalese Gong & Chime Sets",
        "description": "Hand-forged bronze gongs with harmonic overtone tuning.",
        "keywords": ["Nepalese gongs wholesale", "bronze chime sets importer"],
        "buyer_types": ["Distributor", "Sound Therapy Studio"],
        "target_countries": ["United States", "Germany"],
        "email_subject_template": "Direct Import: {{product_name}} for {{company_name}}",
        "email_body_template": "Hello {{contact_name}}, direct export of {{product_name}}.",
        "active": False
    }
    create_res = client.post("/api/products", json=new_prod_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["success"] is True
    prod_id = created_data["product"]["id"]
    assert "nepalese-gong" in prod_id

    # 2. Update product
    update_res = client.put(f"/api/products/{prod_id}", json={
        "description": "Updated harmonic overtone tuning for high-end acoustic studios."
    })
    assert update_res.status_code == 200
    assert "acoustic studios" in update_res.json()["product"]["description"]

    # 3. Activate product
    act_res = client.post(f"/api/products/{prod_id}/activate")
    assert act_res.status_code == 200
    assert act_res.json()["product"]["active"] is True

    # Verify active product in dashboard
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    assert dash_res.json()["active_product"]["id"] == prod_id

    # 4. Clean up / Delete product
    del_res = client.delete(f"/api/products/{prod_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_product_template_personalization():
    from backend.outreach.gmail_sender import EmailSender

    template = "Partnering with {{company_name}} in {{country}} for {{product_name}} ({{product}})."
    rendered = EmailSender.personalize_text(
        template,
        buyer_name="Elena Rostova",
        company_name="Nordic Sound AB",
        country="Sweden",
        buyer_type="Wholesale Importer",
        product="Crystal Singing Bowls"
    )

    assert "Nordic Sound AB" in rendered
    assert "Sweden" in rendered
    assert "Crystal Singing Bowls" in rendered
    assert "{{" not in rendered
