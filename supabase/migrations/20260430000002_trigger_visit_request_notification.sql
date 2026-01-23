CREATE OR REPLACE FUNCTION public.handle_new_visit_with_recommendation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'visit_with' THEN
    INSERT INTO public.notifications (
      type,
      actor_id,
      user_id,
      resource_id,
      recommendation_id,
      created_at
    ) VALUES (
      'visit_request',
      NEW.recommender_id,
      NEW.recipient_id,
      NEW.building_id,
      NEW.id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_visit_with_recommendation_created ON public.recommendations;
CREATE TRIGGER on_visit_with_recommendation_created
  AFTER INSERT ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_visit_with_recommendation();
