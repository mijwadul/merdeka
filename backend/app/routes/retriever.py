from flask import Blueprint, jsonify, request
from app.agents.retriever_agent import (
    add_document_from_url,
    crawl_documents,
    get_discovered_documents,
    embed_documents_by_ids,
    search_pdf_links
)

retriever_bp = Blueprint('retriever', __name__)


@retriever_bp.route('/api/crawl-documents', methods=['POST'])
def trigger_crawler():
    documents = crawl_documents()
    return jsonify({"status": "success", "count": len(documents)}), 200


@retriever_bp.route('/api/found-documents', methods=['GET'])
def list_found_documents():
    documents = get_discovered_documents()
    return jsonify(documents), 200


@retriever_bp.route('/api/embed-documents', methods=['POST'])
def embed_documents():
    data = request.get_json()
    selected_ids = data.get('ids', [])
    if not selected_ids:
        return jsonify({"error": "No IDs provided"}), 400

    results = embed_documents_by_ids(selected_ids)
    return jsonify(results), 200

@retriever_bp.route('/api/search-documents')
def search_documents():
    q = request.args.get('q')
    if not q:
        return jsonify({"error": "No query"}), 400

    results = search_pdf_links(q)
    return jsonify(results), 200

@retriever_bp.route('/api/add-document', methods=['POST'])
def add_document():
    data = request.get_json()
    url = data.get("url")

    if not url or not url.endswith(".pdf"):
        return jsonify({"error": "Invalid or missing PDF URL"}), 400

    result = add_document_from_url(url)
    if isinstance(result, tuple):  # error
        return jsonify(result[0]), result[1]

    return jsonify(result), 200

@retriever_bp.route('/api/query-documents')
def query_documents():
    from app.agents.retriever_agent import query_documents_by_text

    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "No query"}), 400

    results = query_documents_by_text(q)
    return jsonify(results)

@retriever_bp.route('/add-url', methods=['POST'])
def add_url():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"error": "URL is required"}), 400

    result = extract_text_from_url(url)

    if not result["success"]:
        return jsonify({"error": result["error"]}), 500

    embedded = embed_document_from_url(result)
    return jsonify(embedded), 200
