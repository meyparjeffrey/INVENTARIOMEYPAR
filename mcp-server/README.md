# MCP Server

Servidor Node + TypeScript que expone tools de solo lectura para la IA:
- Conecta a Supabase con `@supabase/supabase-js`.
- Ofrece herramientas como `get_product_by_code`, `list_low_stock_products`, etc.
- No debe ejecutar operaciones destructivas sin confirmación humana.

