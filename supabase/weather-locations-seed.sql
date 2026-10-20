-- Starter coverage: one representative location for every Indian state and union territory.
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- Add district-level locations to this table for wider daily coverage.

insert into public.weather_locations
  (city, state, country, latitude, longitude, location_type, is_active)
values
  ('Amaravati', 'Andhra Pradesh', 'India', 16.5062, 80.6480, 'state_capital', true),
  ('Itanagar', 'Arunachal Pradesh', 'India', 27.0844, 93.6053, 'state_capital', true),
  ('Dispur', 'Assam', 'India', 26.1433, 91.7898, 'state_capital', true),
  ('Patna', 'Bihar', 'India', 25.5941, 85.1376, 'state_capital', true),
  ('Raipur', 'Chhattisgarh', 'India', 21.2514, 81.6296, 'state_capital', true),
  ('Panaji', 'Goa', 'India', 15.4909, 73.8278, 'state_capital', true),
  ('Gandhinagar', 'Gujarat', 'India', 23.2156, 72.6369, 'state_capital', true),
  ('Chandigarh', 'Haryana', 'India', 30.7333, 76.7794, 'state_capital', true),
  ('Shimla', 'Himachal Pradesh', 'India', 31.1048, 77.1734, 'state_capital', true),
  ('Ranchi', 'Jharkhand', 'India', 23.3441, 85.3096, 'state_capital', true),
  ('Bengaluru', 'Karnataka', 'India', 12.9716, 77.5946, 'state_capital', true),
  ('Thiruvananthapuram', 'Kerala', 'India', 8.5241, 76.9366, 'state_capital', true),
  ('Bhopal', 'Madhya Pradesh', 'India', 23.2599, 77.4126, 'state_capital', true),
  ('Mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, 'state_capital', true),
  ('Imphal', 'Manipur', 'India', 24.8170, 93.9368, 'state_capital', true),
  ('Shillong', 'Meghalaya', 'India', 25.5788, 91.8933, 'state_capital', true),
  ('Aizawl', 'Mizoram', 'India', 23.7271, 92.7176, 'state_capital', true),
  ('Kohima', 'Nagaland', 'India', 25.6751, 94.1086, 'state_capital', true),
  ('Bhubaneswar', 'Odisha', 'India', 20.2961, 85.8245, 'state_capital', true),
  ('Chandigarh', 'Punjab', 'India', 30.7333, 76.7794, 'state_capital', true),
  ('Jaipur', 'Rajasthan', 'India', 26.9124, 75.7873, 'state_capital', true),
  ('Gangtok', 'Sikkim', 'India', 27.3314, 88.6138, 'state_capital', true),
  ('Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, 'state_capital', true),
  ('Hyderabad', 'Telangana', 'India', 17.3850, 78.4867, 'state_capital', true),
  ('Agartala', 'Tripura', 'India', 23.8315, 91.2868, 'state_capital', true),
  ('Lucknow', 'Uttar Pradesh', 'India', 26.8467, 80.9462, 'state_capital', true),
  ('Dehradun', 'Uttarakhand', 'India', 30.3165, 78.0322, 'state_capital', true),
  ('Kolkata', 'West Bengal', 'India', 22.5726, 88.3639, 'state_capital', true),
  ('Sri Vijaya Puram', 'Andaman and Nicobar Islands', 'India', 11.6234, 92.7265, 'state_capital', true),
  ('Chandigarh', 'Chandigarh', 'India', 30.7333, 76.7794, 'state_capital', true),
  ('Daman', 'Dadra and Nagar Haveli and Daman and Diu', 'India', 20.3974, 72.8328, 'state_capital', true),
  ('New Delhi', 'Delhi', 'India', 28.6139, 77.2090, 'state_capital', true),
  ('Srinagar', 'Jammu and Kashmir', 'India', 34.0837, 74.7973, 'state_capital', true),
  ('Leh', 'Ladakh', 'India', 34.1526, 77.5771, 'state_capital', true),
  ('Kavaratti', 'Lakshadweep', 'India', 10.5667, 72.6417, 'state_capital', true),
  ('Puducherry', 'Puducherry', 'India', 11.9416, 79.8083, 'state_capital', true)
on conflict (city, state, country) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  location_type = excluded.location_type,
  is_active = true,
  updated_at = now();
