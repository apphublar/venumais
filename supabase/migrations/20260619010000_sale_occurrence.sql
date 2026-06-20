-- Add occurrence fields to sales table
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS occurrence_type   text CHECK (occurrence_type IN ('reclamacao','troca','reembolso')),
  ADD COLUMN IF NOT EXISTS occurrence_obs    text,
  ADD COLUMN IF NOT EXISTS occurrence_loss   numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS occurrence_products jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS occurrence_at     timestamptz;

-- RPC: save_sale_occurrence
CREATE OR REPLACE FUNCTION save_sale_occurrence(
  p_store_id        uuid,
  p_sale_id         uuid,
  p_type            text,
  p_obs             text,
  p_loss            numeric,
  p_products        jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Verify the sale belongs to the store
  IF NOT EXISTS (
    SELECT 1 FROM sales WHERE id = p_sale_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  UPDATE sales
  SET
    occurrence_type     = p_type,
    occurrence_obs      = p_obs,
    occurrence_loss     = COALESCE(p_loss, 0),
    occurrence_products = COALESCE(p_products, '[]'),
    occurrence_at       = NOW()
  WHERE id = p_sale_id AND store_id = p_store_id;
END;
$$;

-- RPC: remove_sale_occurrence
CREATE OR REPLACE FUNCTION remove_sale_occurrence(
  p_store_id uuid,
  p_sale_id  uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE sales
  SET
    occurrence_type     = NULL,
    occurrence_obs      = NULL,
    occurrence_loss     = 0,
    occurrence_products = '[]',
    occurrence_at       = NULL
  WHERE id = p_sale_id AND store_id = p_store_id;
END;
$$;

-- RPC: mark_multiple_installments_paid
CREATE OR REPLACE FUNCTION mark_multiple_installments_paid(
  p_store_id       uuid,
  p_sale_id        uuid,
  p_installment_ids uuid[],
  p_payment_method text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verify the sale belongs to the store
  IF NOT EXISTS (
    SELECT 1 FROM sales WHERE id = p_sale_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  FOREACH v_id IN ARRAY p_installment_ids
  LOOP
    UPDATE sale_installments
    SET
      paid           = TRUE,
      paid_at        = NOW(),
      payment_method = p_payment_method,
      updated_at     = NOW()
    WHERE id = v_id
      AND sale_id = p_sale_id
      AND paid = FALSE;
  END LOOP;
END;
$$;
