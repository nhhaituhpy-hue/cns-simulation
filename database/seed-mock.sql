-- Seed mock users for local UI development.
-- Passwords: admin=Admin@123, teacher/student=User@123
-- Run after migrations: psql ... -f database/seed-mock.sql

INSERT INTO public.users (username, email, password_hash, full_name, work_unit, role, is_active, must_change_password)
VALUES
  ('admin', 'admin@attech.com.vn',
   'scrypt$16384$8$1$ljurr3JrVkfAcmCFRulXZw$FoesKitE1GJ7lFktklnjjOwQuT8ELEIV9hDYyUJA0Pa1D2jwROoI-btRVwfMM_tdwl6R6l_6n7JKwc749fxeOg',
   'Admin', 'ATTECH', 'admin', true, false),
  ('teacher', 'teacher@attech.com.vn',
   'scrypt$16384$8$1$paXFb12xdo_7s9QgN4oD2A$gERHFg7uarUqtlY8menJomifK8bPhYv_cRBReLiQn6eJgeS93ycuqE4onx6oTLInCac6r7Hm5DZT1DknAX-6Uw',
   'Teacher', 'ATTECH', 'teacher', true, false),
  ('student', 'student@attech.com.vn',
   'scrypt$16384$8$1$paXFb12xdo_7s9QgN4oD2A$gERHFg7uarUqtlY8menJomifK8bPhYv_cRBReLiQn6eJgeS93ycuqE4onx6oTLInCac6r7Hm5DZT1DknAX-6Uw',
   'Student', 'ATTECH', 'student', true, false)
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      is_active = true,
      must_change_password = false;
