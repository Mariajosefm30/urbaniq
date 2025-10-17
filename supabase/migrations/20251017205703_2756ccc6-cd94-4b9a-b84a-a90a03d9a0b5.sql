-- Create function to sync manager assignments when manager_email is set
CREATE OR REPLACE FUNCTION public.sync_manager_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_user_id uuid;
BEGIN
  -- If manager_email is set, find or handle the manager
  IF NEW.manager_email IS NOT NULL THEN
    -- Find the manager user by email
    SELECT id INTO manager_user_id
    FROM profiles
    WHERE email = NEW.manager_email AND role = 'manager'
    LIMIT 1;

    -- If manager exists, ensure assignment in manager_buildings
    IF manager_user_id IS NOT NULL THEN
      INSERT INTO manager_buildings (user_id, building_id)
      VALUES (manager_user_id, NEW.id)
      ON CONFLICT (user_id, building_id) DO NOTHING;
    END IF;
  END IF;

  -- If manager_email is removed or changed, clean up old assignments
  IF OLD.manager_email IS NOT NULL AND (NEW.manager_email IS NULL OR NEW.manager_email != OLD.manager_email) THEN
    SELECT id INTO manager_user_id
    FROM profiles
    WHERE email = OLD.manager_email
    LIMIT 1;

    IF manager_user_id IS NOT NULL THEN
      DELETE FROM manager_buildings
      WHERE user_id = manager_user_id AND building_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync manager assignments
DROP TRIGGER IF EXISTS sync_manager_assignment_trigger ON public.buildings_new;
CREATE TRIGGER sync_manager_assignment_trigger
AFTER INSERT OR UPDATE OF manager_email ON public.buildings_new
FOR EACH ROW
EXECUTE FUNCTION public.sync_manager_assignment();

-- Manually sync existing buildings with manager_email
DO $$
DECLARE
  building_record RECORD;
  manager_user_id uuid;
BEGIN
  FOR building_record IN 
    SELECT id, manager_email 
    FROM buildings_new 
    WHERE manager_email IS NOT NULL
  LOOP
    SELECT id INTO manager_user_id
    FROM profiles
    WHERE email = building_record.manager_email AND role = 'manager'
    LIMIT 1;

    IF manager_user_id IS NOT NULL THEN
      INSERT INTO manager_buildings (user_id, building_id)
      VALUES (manager_user_id, building_record.id)
      ON CONFLICT (user_id, building_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;