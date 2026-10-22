// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111", role: "admin", mustChangePassword: false })) }));
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { fixture as evidenceFixture } from "../ai/step-assessment-fixtures";
const actorId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
describe.skipIf(!testUrl)("frozen automatic feedback in isolated PostgreSQL", () => {
  const name = `cns_feedback_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client | undefined; let pool: Pool; let created = false;
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) throw new Error("Explicit isolated loopback endpoint required");
    control = new Client({ connectionString: url.href }); await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${name}"`); created = true; url.pathname = `/${name}`;
    pool = new Pool({ connectionString: url.href, max: 6 });
    for (const file of (await readdir(resolve("database/migrations"))).filter(f => /^\d+_.*\.sql$/.test(f)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file.startsWith("0001_")) for (const [id, role] of [[actorId, "admin"], [studentId, "student"]]) await pool.query(`insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,$2,$3,'non-login-fixture','Test','Lab',$2,false)`, [id, role, `${role}@attech.com.vn`]);
    }
  }, 30000);
  afterAll(async () => { await pool?.end(); if (created) await control?.query(`drop database "${name}"`); await control?.end(); });
  const rubric = { version: 1, moduleId: "dvor-1150a", steps: [], parameterRelevance: [], citations: [] };
  async function published(kind = "practice", assessmentRubric: unknown = rubric) {
    const definition = { ...createDefaultDvor1150aScenarioDefinition(), id: `fixture-${randomUUID()}` };
    const source = (await pool.query(`insert into public.simulator_scenario_parameters(module_id,scenario_id,name,description,difficulty,schema_version,definition_json,assessment_rubric_json,created_by) values('dvor-1150a',$1,$2,'','basic',1,$3,$4,$5) returning *`, [definition.id, definition.name, definition, assessmentRubric, actorId])).rows[0];
    const membership = (await pool.query(`insert into public.simulator_scenario_library_memberships(module_id,scenario_parameters_id,library_kind,revision_number,scenario_id,name,description,difficulty,schema_version,definition_json,published_by,sort_order) values('dvor-1150a',$1,$2,1,$3,$4,'','basic',1,$5,$6,(select coalesce(max(sort_order),0)+1 from public.simulator_scenario_library_memberships where library_kind=$2)) returning *`, [source.id, kind, definition.id, definition.name, definition, actorId])).rows[0];
    return { definition, source, membership };
  }
  it("rejects a submission from an older published membership rather than grading against a newer answer", async () => {
    const { createPracticeSubmission } = await import("@/lib/ai/feedback/jobs");
    const fixture = await published();
    await expect(createPracticeSubmission(pool, actorId, randomUUID(), {
      moduleId: "dvor-1150a", scenarioId: fixture.source.id, payload: {}, libraryMembershipId: randomUUID(),
    } as never)).rejects.toMatchObject({ code: "PUBLICATION_CHANGED" });
    const result = await createPracticeSubmission(pool, actorId, randomUUID(), {
      moduleId: "dvor-1150a", scenarioId: fixture.source.id, payload: {}, libraryMembershipId: fixture.membership.id,
    } as never);
    const row = (await pool.query("select library_membership_id from public.practice_submissions where id=$1", [result.submissionId])).rows[0];
    expect(row.library_membership_id).toBe(fixture.membership.id);
  });
  async function examFixture(assessmentRubric: unknown = rubric) {
    const { membership, definition } = await published("exam", assessmentRubric);
    const exam = (await pool.query("insert into public.scenario_exams(name,duration_minutes,created_by) values('Test exam',60,$1) returning id", [actorId])).rows[0];
    const code = (await pool.query("insert into public.scenario_exam_codes(exam_id,code_hash,code_hint,candidate_name,candidate_unit,status,redeem_user_id,created_by) values($1,$2,'TEST','Test candidate','Lab','in_progress',$3,$4) returning id", [exam.id, randomUUID().replaceAll('-','').repeat(2), studentId, actorId])).rows[0];
    const subject = (await pool.query("insert into public.scenario_exam_code_subjects(code_id,module_id,position,status) values($1,'dvor-1150a',1,'in_progress') returning id", [code.id])).rows[0];
    const session = (await pool.query("insert into public.scenario_exam_sessions(code_id,candidate_user_id,session_token_hash,deadline_at) values($1,$2,$3,now()+interval '1 hour') returning id", [code.id, studentId, randomUUID().replaceAll('-','').repeat(2)])).rows[0];
    const item = (await pool.query("insert into public.scenario_exam_session_items(session_id,code_subject_id,module_id,library_membership_id,library_revision_number,scenario_id,scenario_name,definition_snapshot_json,engine_version,evaluator_version) values($1,$2,'dvor-1150a',$3,1,$4,$5,$6,'test','test') returning *", [session.id, subject.id, membership.id, definition.id, definition.name, definition])).rows[0];
    return { item, session, code, membership, definition };
  }
  async function legacyFixture(moduleCode = "vor", nativeAdsb = false) {
    const subjectId = randomUUID(), paperId = randomUUID(), scenarioId = `legacy-${randomUUID()}`;
    await pool.query("insert into public.exam_modules(code,name) values($1,'Legacy device') on conflict do nothing", [moduleCode]);
    await pool.query("insert into public.exam_subjects(id,code,name) values($1,$2,'Test subject')", [subjectId, subjectId.replaceAll('-','').toUpperCase()]);
    await pool.query("insert into public.exam_subject_modules(subject_id,module_code,module_name) values($1,$2,'Test device')", [subjectId, moduleCode]);
    if (moduleCode === "ads-b") await pool.query(`insert into public.scenarios(id,title,description,difficulty,sites_json,target_sensor_id,target_login_user,expected_actions_json,created_at)
      values($1,'Frozen ADS-B','Test only','easy','[]','test','maintenance','[]','2026-01-01')`, [scenarioId]);
    else await pool.query(`insert into public.${moduleCode === "vor" ? "vor" : "dme"}_scenarios(id,title,description,difficulty,prompt) values($1,'Frozen legacy','Test only','easy','Old prompt')`, [scenarioId]);
    if (nativeAdsb) {
      const { DEFAULT_SCENARIOS } = await import("@/stores/default-scenarios");
      const native = DEFAULT_SCENARIOS[0];
      await pool.query(`update public.scenarios set sites_json=$2,target_sensor_id=$3,target_login_user=$4,expected_actions_json=$5,
        hardware_fault_json=$6,event_log_json=$7 where id=$1`, [scenarioId, JSON.stringify(native.sites), native.targetSensorId, native.targetLoginUser,
        JSON.stringify(native.expectedActions), native.hardwareFault ? JSON.stringify(native.hardwareFault) : null, native.eventLog ? JSON.stringify(native.eventLog) : null]);
    }
    const set = (await pool.query("select public.save_exam_set($1,null,'Test set','',$2,true) id", [actorId, JSON.stringify([{ subjectId, papers: [{ id: paperId, paperNumber: 1, title: "Test paper", scenarios: [{ moduleCode, scenarioId, position: 1 }] }] }])])).rows[0].id;
    const examId = (await pool.query("insert into public.exams(name,exam_date,location,decision_basis,exam_set_id,status,created_by) values('Test exam',current_date,'ha_noi','Test only',$1,'open',$2) returning id", [set, actorId])).rows[0].id;
    const client = await pool.connect();
    let candidateId: string;
    try {
      await client.query("begin"); await client.query("select set_config('app.actor_user_id',$1,true)", [actorId]);
      candidateId = (await client.query("select public.save_exam_candidate(null,$1,'Test candidate','Lab','student@attech.com.vn',$2) id", [examId, JSON.stringify([{ subjectId, examPaperId: paperId }])])).rows[0].id;
      await client.query("commit");
    } finally { client.release(); }
    const assignmentId = (await pool.query("select id from public.exam_candidate_subjects where candidate_id=$1", [candidateId!])).rows[0].id;
    return { scenarioId, assignmentId, examId };
  }
  it("legacy RPC submit enqueues frozen input once, rolls back atomically and never uses edited source", async () => {
    const fixture = await legacyFixture();
    const started = (await pool.query("select public.start_exam_attempt($1,$2) result", [studentId, fixture.assignmentId])).rows[0].result;
    const item = (await pool.query("select * from public.exam_attempt_items where attempt_id=$1", [started.id])).rows[0];
    await expect(pool.query("update public.vor_scenarios set prompt='New answer' where id=$1", [fixture.scenarioId])).rejects.toThrow("không thể sửa");
    const payload = { moduleCode: "vor", events: [], answer: {}, startedAt: "2026-01-01", submittedAt: "2026-01-01" };
    const client = await pool.connect();
    try {
      await client.query("begin"); await client.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, payload]);
      expect((await client.query("select id from public.ai_attempt_feedback_jobs where legacy_attempt_item_id=$1", [item.id])).rows).toHaveLength(1);
      await client.query("rollback");
    } finally { client.release(); }
    expect((await pool.query("select id from public.ai_attempt_feedback_jobs where legacy_attempt_item_id=$1", [item.id])).rows).toHaveLength(0);
    for (let retry = 0; retry < 2; retry++) await pool.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, payload]);
    const jobs = (await pool.query("select * from public.ai_attempt_feedback_jobs where legacy_attempt_item_id=$1", [item.id])).rows;
    expect(jobs).toHaveLength(1); expect(jobs[0].definition_json.prompt).toBe("Old prompt"); expect(jobs[0].assessment_rubric_json).toBeNull();
    expect(jobs[0].payload_json).toMatchObject(payload);
  });
  it("releases legacy feedback only after full attempt and denies revoked or reassigned owners", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
    const fixture = await legacyFixture();
    const started = (await pool.query("select public.start_exam_attempt($1,$2) result", [studentId, fixture.assignmentId])).rows[0].result;
    const item = (await pool.query("select id from public.exam_attempt_items where attempt_id=$1", [started.id])).rows[0];
    await pool.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, { moduleCode: "vor", events: [], answer: {}, startedAt: "2026-01-01", submittedAt: "2026-01-01" }]);
    const target = { legacyAttemptItemId: item.id };
    expect(await repo.readAttemptFeedback(pool, studentId, target)).toEqual({ status: "withheld" });
    const job = await repo.claimFeedbackJob(pool, "legacy"); expect(job).not.toBeNull();
    const feedback = { summary: "Frozen legacy" } as import("@/lib/ai/feedback/attempt-feedback").AttemptFeedbackReport;
    expect(await repo.completeFeedbackJob(pool, job!.id, job!.attemptToken, feedback)).toBe(true);
    expect(await repo.readAttemptFeedback(pool, actorId, target)).toEqual({ status: "completed", feedback });
    await pool.query("select public.complete_exam_attempt($1,$2)", [studentId, started.id]);
    expect(await repo.readAttemptFeedback(pool, studentId, target)).toEqual({ status: "completed", feedback });
    const client = await pool.connect();
    try {
      await client.query("begin"); await client.query("select set_config('app.actor_user_id',$1,true)", [actorId]);
      await client.query("update public.exam_attempts set revoked_at=now() where id=$1", [started.id]); await client.query("commit");
    } finally { client.release(); }
    for (const id of [studentId, actorId]) await expect(repo.readAttemptFeedback(pool, id, target)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("processes legacy VOR/DME frozen evidence without inventing native criteria or scores", async () => {
    const { runNextFeedback } = await import("@/lib/ai/feedback/worker");
    for (const moduleCode of ["vor", "dme"]) {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
      const fixture = await legacyFixture(moduleCode);
      const attempt = (await pool.query("select public.start_exam_attempt($1,$2) result", [studentId, fixture.assignmentId])).rows[0].result;
      const item = (await pool.query("select id from public.exam_attempt_items where attempt_id=$1", [attempt.id])).rows[0];
      await pool.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, { moduleCode, events: [], answer: {}, startedAt: "2026-01-01", submittedAt: "2026-01-01" }]);
      expect(await runNextFeedback(pool, "legacy-real-worker")).toBe("completed");
      const job = (await pool.query("select feedback_json from public.ai_attempt_feedback_jobs where legacy_attempt_item_id=$1", [item.id])).rows[0];
      expect(job.feedback_json).toMatchObject({ scenarioId: fixture.scenarioId, status: "UNVERIFIED", solved: null, sourceMode: "deterministic-only", references: [] });
      expect(job.feedback_json.stepAssessment).toBeUndefined();
      expect((await pool.query("select official_score from public.exam_candidate_subjects where id=$1", [fixture.assignmentId])).rows[0].official_score).toBeNull();
    }
  });
  it("freezes only a definition-matched legacy ADS-B rubric, never the latest changed answer", async () => {
    const { runNextFeedback } = await import("@/lib/ai/feedback/worker");
    const { DEFAULT_SCENARIOS } = await import("@/stores/default-scenarios");
    const { parseAdsbScenarioDefinition } = await import("@/modules/devices/adsb/scenario-parameters");
    for (const matched of [true, false]) {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
      const fixture = await legacyFixture("ads-b");
      const existing = (await pool.query("select * from public.scenarios where id=$1", [fixture.scenarioId])).rows[0];
      // Legacy source is already locked by the applied paper: use its exact shape.
      const definition = { schemaVersion: 1, id: fixture.scenarioId, name: existing.title, description: existing.description,
        difficulty: "basic", sites: JSON.parse(existing.sites_json), targetSensorId: existing.target_sensor_id,
        targetLoginUser: existing.target_login_user, expectedActions: JSON.parse(existing.expected_actions_json) };
      const snapshotRubric = { ...rubric, moduleId: "ads-b" };
      const source = (await pool.query(`insert into public.simulator_scenario_parameters(module_id,scenario_id,name,description,difficulty,schema_version,definition_json,assessment_rubric_json,created_by)
        values('ads-b',$1,$2,'','basic',1,$3,$4,$5) returning id`, [fixture.scenarioId, existing.title, matched ? definition : { ...definition, description: "newer canonical" }, snapshotRubric, actorId])).rows[0];
      const attempt = (await pool.query("select public.start_exam_attempt($1,$2) result", [studentId, fixture.assignmentId])).rows[0].result;
      const item = (await pool.query("select * from public.exam_attempt_items where attempt_id=$1", [attempt.id])).rows[0];
      expect(item.assessment_rubric_snapshot_json).toEqual(matched ? snapshotRubric : null);
      await pool.query("update public.simulator_scenario_parameters set definition_json=$2,assessment_rubric_json=$3 where id=$1", [source.id, parseAdsbScenarioDefinition(DEFAULT_SCENARIOS[0]), { ...snapshotRubric, citations: [{ changed: true }] }]);
      await pool.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, { moduleCode: "ads-b", selectedActions: [], allActions: [], diagnosedComponentIds: [], inspectedComponentIds: [] }]);
      const job = (await pool.query("select * from public.ai_attempt_feedback_jobs where legacy_attempt_item_id=$1", [item.id])).rows[0];
      expect(job.definition_json).toEqual(definition); expect(job.assessment_rubric_json).toEqual(matched ? snapshotRubric : null);
      // Missing/invalid legacy native data must fail closed, never borrow defaults.
      expect(await runNextFeedback(pool, "adsb-frozen")).toBe("failed");
    }
  });
  it("executes native ADS-B and code-based feedback end to end from frozen submissions without provider", async () => {
    const { runNextFeedback } = await import("@/lib/ai/feedback/worker");
    const { readAttemptFeedback } = await import("@/lib/ai/feedback/jobs");
    vi.stubEnv("CNS_AI_ENABLED", "false");
    try {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
      const fixture = await legacyFixture("ads-b", true);
      const attempt = (await pool.query("select public.start_exam_attempt($1,$2) result", [studentId, fixture.assignmentId])).rows[0].result;
      const item = (await pool.query("select id from public.exam_attempt_items where attempt_id=$1", [attempt.id])).rows[0];
      await pool.query("select public.complete_exam_attempt_item($1,$2,null,$3)", [studentId, item.id, { moduleCode: "ads-b", selectedActions: [], allActions: [], diagnosedComponentIds: [], inspectedComponentIds: [] }]);
      expect(await runNextFeedback(pool, "native-adsb")).toBe("completed");
      expect(await readAttemptFeedback(pool, actorId, { legacyAttemptItemId: item.id })).toMatchObject({ status: "completed", feedback: { moduleId: "ads-b", scenarioId: fixture.scenarioId, sourceMode: "deterministic-only" } });
      const evidence = evidenceFixture();
      const code = await examFixture(evidence.rubric);
      await pool.query("update public.scenario_exam_session_items set status='submitted',submitted_at=now(),result_json=$2 where id=$1", [code.item.id, { payload: evidence.payload }]);
      expect(await runNextFeedback(pool, "native-code")).toBe("completed");
      expect(await readAttemptFeedback(pool, actorId, { examItemId: code.item.id })).toMatchObject({ status: "completed", feedback: { moduleId: "dvor-1150a", scenarioId: code.definition.id, sourceMode: "deterministic-only", stepAssessment: { correct: 4, totalRequiredSteps: 6 } } });
    } finally { vi.unstubAllEnvs(); }
  });
  it("freezes exam rubric at begin and enqueues in the submit transaction including timeout", async () => {
    for (const status of ["submitted", "timed_out"]) {
      const { item, definition, membership } = await examFixture();
      expect(item.assessment_rubric_snapshot_json).toEqual(rubric);
      await pool.query("update public.simulator_scenario_library_memberships set archived_at=now() where id=$1", [membership.id]);
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("update public.scenario_exam_session_items set status=$2,submitted_at=now(),result_json=$3 where id=$1", [item.id, status, { payload: { visitedViewIds: ["monitor"] } }]);
        expect((await client.query("select * from public.ai_attempt_feedback_jobs where exam_item_id=$1", [item.id])).rows).toHaveLength(1);
        await client.query("rollback");
      } finally { client.release(); }
      expect((await pool.query("select * from public.ai_attempt_feedback_jobs where exam_item_id=$1", [item.id])).rows).toHaveLength(0);
      await pool.query("update public.scenario_exam_session_items set status=$2,submitted_at=now() where id=$1", [item.id, status]);
      await pool.query("update public.scenario_exam_session_items set status=$2 where id=$1", [item.id, status]);
      const jobs = (await pool.query("select * from public.ai_attempt_feedback_jobs where exam_item_id=$1", [item.id])).rows;
      expect(jobs).toHaveLength(1); expect(jobs[0].definition_json).toEqual(definition); expect(jobs[0].assessment_rubric_json).toEqual(rubric);
      await expect(pool.query("update public.scenario_exam_session_items set result_json='{}' where id=$1", [item.id])).rejects.toMatchObject({ code: "23514" });
    }
  });
  it("terminal submit retries do not contend with an already leased outbox job", async () => {
    const { item } = await examFixture();
    await pool.query("update public.scenario_exam_session_items set status='submitted',submitted_at=now() where id=$1", [item.id]);
    const owner = await pool.connect(), retry = await pool.connect();
    try {
      await owner.query("begin"); await owner.query("select id from public.ai_attempt_feedback_jobs where exam_item_id=$1 for update", [item.id]);
      await retry.query("begin"); await retry.query("set local lock_timeout='400ms'");
      await retry.query("update public.scenario_exam_session_items set status='submitted' where id=$1", [item.id]);
      await retry.query("commit");
    } finally { await retry.query("rollback"); await owner.query("rollback"); retry.release(); owner.release(); }
    expect((await pool.query("select id from public.ai_attempt_feedback_jobs where exam_item_id=$1", [item.id])).rows).toHaveLength(1);
  });
  it("authorizes reads against current ownership and withholds answers until the whole session ends", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    const { item, session, code } = await examFixture();
    await pool.query("update public.scenario_exam_session_items set status='submitted',submitted_at=now() where id=$1", [item.id]);
    await pool.query("update public.ai_attempt_feedback_jobs set status='completed',feedback_json=$2 where exam_item_id=$1", [item.id, { summary: "SECRET ANSWER" }]);
    const target = { examItemId: item.id };
    expect(await repo.readAttemptFeedback(pool, studentId, target)).toEqual({ status: "withheld" });
    expect(await repo.readAttemptFeedback(pool, actorId, target)).toEqual({ status: "completed", feedback: { summary: "SECRET ANSWER" } });
    await pool.query("update public.scenario_exam_sessions set status='submitted',submitted_at=now(),terminal_reason='submitted' where id=$1", [session.id]);
    await pool.query("update public.scenario_exam_codes set status='submitted' where id=$1", [code.id]);
    expect(await repo.readAttemptFeedback(pool, studentId, target)).toEqual({ status: "completed", feedback: { summary: "SECRET ANSWER" } });
    await pool.query("update public.scenario_exam_codes set status='revoked' where id=$1", [code.id]);
    for (const id of [studentId, actorId]) await expect(repo.readAttemptFeedback(pool, id, target)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("denies revoked sessions at claim, heartbeat and late completion", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    const feedback = { summary: "must not publish" } as import("@/lib/ai/feedback/attempt-feedback").AttemptFeedbackReport;
    for (const phase of ["claim", "heartbeat", "complete"] as const) {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
      const { item, code } = await examFixture();
      await pool.query("update public.scenario_exam_session_items set status='submitted',submitted_at=now() where id=$1", [item.id]);
      const job = phase === "claim" ? null : await repo.claimFeedbackJob(pool, "revocation-test");
      await pool.query("update public.scenario_exam_codes set revoked_at=now() where id=$1", [code.id]);
      if (phase === "claim") expect(await repo.claimFeedbackJob(pool, "revocation-test")).toBeNull();
      else if (phase === "heartbeat") expect(await repo.heartbeatFeedbackJob(pool, job!.id, job!.attemptToken)).toBe(false);
      else expect(await repo.completeFeedbackJob(pool, job!.id, job!.attemptToken, feedback)).toBe(false);
      expect((await pool.query("select status,feedback_json from public.ai_attempt_feedback_jobs where exam_item_id=$1", [item.id])).rows[0]).toEqual({ status: "failed", feedback_json: null });
    }
  });
  it("rechecks active actors and changed student roles before publishing a result", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    const report = { summary: "must stay private" } as import("@/lib/ai/feedback/attempt-feedback").AttemptFeedbackReport;
    for (const phase of ["claim", "heartbeat", "complete"] as const) {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
      const { definition } = await published();
      await repo.createPracticeSubmission(pool, studentId, randomUUID(), { moduleId: "dvor-1150a", scenarioId: definition.id, payload: {} });
      const job = phase === "claim" ? null : await repo.claimFeedbackJob(pool, "active-actor");
      try {
        await pool.query("update public.users set is_active=false where id=$1", [studentId]);
        if (phase === "claim") expect(await repo.claimFeedbackJob(pool, "active-actor")).toBeNull();
        else if (phase === "heartbeat") expect(await repo.heartbeatFeedbackJob(pool, job!.id, job!.attemptToken)).toBe(false);
        else expect(await repo.completeFeedbackJob(pool, job!.id, job!.attemptToken, report)).toBe(false);
      } finally { await pool.query("update public.users set is_active=true where id=$1", [studentId]); }
    }
    const { item, session, code } = await examFixture();
    await pool.query("update public.scenario_exam_session_items set status='submitted',submitted_at=now() where id=$1", [item.id]);
    const job = await repo.claimFeedbackJob(pool, "role-change");
    expect(await repo.completeFeedbackJob(pool, job!.id, job!.attemptToken, report)).toBe(true);
    await pool.query("update public.scenario_exam_sessions set status='submitted',submitted_at=now(),terminal_reason='submitted' where id=$1", [session.id]);
    await pool.query("update public.scenario_exam_codes set status='submitted' where id=$1", [code.id]);
    try {
      await pool.query("update public.users set role='teacher' where id=$1", [studentId]);
      for (const actor of [studentId, actorId]) await expect(repo.readAttemptFeedback(pool, actor, { examItemId: item.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally { await pool.query("update public.users set role='student' where id=$1", [studentId]); }
  });
  it("limits new practice jobs atomically but permits exact retries at quota", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    const user = randomUUID();
    await pool.query(`insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,$2,$3,'non-login-fixture','Quota','Lab','student',false)`, [user, user, `${user}@attech.com.vn`]);
    const { definition } = await published();
    const input = { moduleId: "dvor-1150a" as const, scenarioId: definition.id, payload: {} };
    const key = randomUUID(); const first = await repo.createPracticeSubmission(pool, user, key, input);
    const concurrent = await Promise.allSettled([repo.createPracticeSubmission(pool, user, randomUUID(), input), repo.createPracticeSubmission(pool, user, randomUUID(), input)]);
    expect(concurrent.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter(r => r.status === "rejected")).toMatchObject([{ reason: { code: "ACTIVE_QUOTA" } }]);
    expect(await repo.createPracticeSubmission(pool, user, key, input)).toEqual(first);
    for (let count = 2; count < 50; count++) {
      await pool.query("update public.ai_attempt_feedback_jobs set status='failed' where practice_submission_id in (select id from public.practice_submissions where actor_id=$1)", [user]);
      await repo.createPracticeSubmission(pool, user, randomUUID(), input);
    }
    await expect(repo.createPracticeSubmission(pool, user, randomUUID(), input)).rejects.toMatchObject({ code: "DAILY_QUOTA" });
    expect((await repo.createPracticeSubmission(pool, user, key, input)).submissionId).toBe(first.submissionId);
  });
  it("claims once across concurrent workers and terminates crashed jobs at the retry budget", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
    const { definition } = await published();
    const created = await repo.createPracticeSubmission(pool, studentId, randomUUID(), { moduleId: "dvor-1150a", scenarioId: definition.id, payload: { visitedViewIds: ["monitor"] } });
    const results = await Promise.all([repo.claimFeedbackJob(pool, "concurrent-a"), repo.claimFeedbackJob(pool, "concurrent-b")]);
    expect(results.filter(Boolean)).toHaveLength(1); expect(results.find(Boolean)!.id).toBe(created.jobId);
    const before = (await pool.query("select definition_json,assessment_rubric_json,payload_json,snapshot_hash from public.ai_attempt_feedback_jobs where id=$1", [created.jobId])).rows[0];
    await expect(pool.query("update public.ai_attempt_feedback_jobs set payload_json='{}' where id=$1", [created.jobId])).rejects.toMatchObject({ code: "23514" });
    await expect(pool.query("update public.practice_submissions set payload_json='{}' where id=$1", [created.submissionId])).rejects.toMatchObject({ code: "23514" });
    for (let attempt = 2; attempt <= 3; attempt++) {
      await pool.query("update public.ai_attempt_feedback_jobs set lease_expires_at=now()-interval '1 second' where id=$1", [created.jobId]);
      expect((await repo.claimFeedbackJob(pool, "crash-recovery"))!.attempts).toBe(attempt);
    }
    await pool.query("update public.ai_attempt_feedback_jobs set lease_expires_at=now()-interval '1 second' where id=$1", [created.jobId]);
    expect(await repo.claimFeedbackJob(pool, "exhausted")).toBeNull();
    expect((await pool.query("select status,error_code from public.ai_attempt_feedback_jobs where id=$1", [created.jobId])).rows[0]).toEqual({ status: "failed", error_code: "ATTEMPTS_EXHAUSTED" });
    expect((await pool.query("select definition_json,assessment_rubric_json,payload_json,snapshot_hash from public.ai_attempt_feedback_jobs where id=$1", [created.jobId])).rows[0]).toEqual(before);
  });
  it("fences expired workers, retries boundedly and never changes official scores", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    await pool.query("update public.ai_attempt_feedback_jobs set status='failed'");
    const { definition } = await published();
    const created = await repo.createPracticeSubmission(pool, studentId, randomUUID(), { moduleId: "dvor-1150a", scenarioId: definition.id, payload: {} });
    const first = (await repo.claimFeedbackJob(pool, "first"))!;
    expect(first.id).toBe(created.jobId); expect(await repo.heartbeatFeedbackJob(pool, first.id, first.attemptToken)).toBe(true);
    await pool.query("update public.ai_attempt_feedback_jobs set lease_expires_at=now()-interval '1 second' where id=$1", [first.id]);
    const second = (await repo.claimFeedbackJob(pool, "second"))!;
    expect(second.attemptToken).not.toBe(first.attemptToken);
    const feedback = { summary: "safe" } as import("@/lib/ai/feedback/attempt-feedback").AttemptFeedbackReport;
    expect(await repo.completeFeedbackJob(pool, first.id, first.attemptToken, feedback)).toBe(false);
    expect(await repo.heartbeatFeedbackJob(pool, first.id, first.attemptToken)).toBe(false);
    expect(await repo.failFeedbackJob(pool, first.id, first.attemptToken)).toBe(false);
    expect(await repo.failFeedbackJob(pool, second.id, second.attemptToken)).toBe(true);
    await pool.query("update public.ai_attempt_feedback_jobs set available_at=now() where id=$1", [first.id]);
    const last = (await repo.claimFeedbackJob(pool, "third"))!; expect(last.attempts).toBe(3);
    expect(await repo.completeFeedbackJob(pool, last.id, last.attemptToken, feedback)).toBe(true);
    expect(await repo.readAttemptFeedback(pool, studentId, { practiceSubmissionId: created.submissionId })).toEqual({ status: "completed", feedback });
    expect((await pool.query("select count(*)::int n from public.scenario_exam_session_items where examiner_score is not null")).rows[0].n).toBe(0);
  });
  it("atomically stores practice evidence and one outbox job for concurrent exact retries", async () => {
    const repo = await import("@/lib/ai/feedback/jobs");
    const { definition, membership, source } = await published();
    const input = { moduleId: "dvor-1150a" as const, scenarioId: definition.id, payload: { visitedViewIds: ["monitor"] } };
    const key = randomUUID();
    const [first, retry] = await Promise.all([repo.createPracticeSubmission(pool, studentId, key, input), repo.createPracticeSubmission(pool, studentId, key, input)]);
    expect(retry).toEqual(first); expect(first.status).toBe("queued");
    const job = (await pool.query("select * from public.ai_attempt_feedback_jobs where practice_submission_id=$1", [first.submissionId])).rows;
    expect(job).toHaveLength(1); expect(job[0].assessment_rubric_json).toEqual(rubric);
    expect(job[0].definition_json).toEqual(definition); expect(job[0].payload_json).toEqual(input.payload);
    await pool.query("update public.simulator_scenario_parameters set definition_json=$2 where id=$1", [source.id, { ...definition, description: "later" }]);
    expect((await pool.query("select definition_json from public.ai_attempt_feedback_jobs where id=$1", [first.jobId])).rows[0].definition_json).toEqual(definition);
    await expect(repo.createPracticeSubmission(pool, studentId, key, { ...input, payload: { altered: true } })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await pool.query("update public.simulator_scenario_library_memberships set archived_at=now() where id=$1", [membership.id]);
    await expect(repo.createPracticeSubmission(pool, studentId, randomUUID(), input)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("the shipped publication route versions definitions and freezes assignment rubric across republish", async () => {
    const previous = globalThis.cnsSimulatorDatabasePool; globalThis.cnsSimulatorDatabasePool = pool;
    try {
      const { PUT } = await import("@/app/api/scenario-libraries/route");
      const { source, definition } = await published();
      const revision = (await pool.query("select revision from public.simulator_scenario_library_revisions where module_id='dvor-1150a' and library_kind='practice'")).rows[0].revision;
      const publish = (expectedRevision: number) => PUT(new Request("https://labs.cnsvn.com/api/scenario-libraries", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ moduleId: "dvor-1150a", libraryKind: "practice", scenarioIds: [source.id], expectedRevision }) }));
      expect((await publish(revision)).status).toBe(200);
      const first = (await pool.query("select * from public.simulator_review_scenario_assignments where scenario_parameters_id=$1", [source.id])).rows[0];
      expect(first.definition_snapshot_json).toEqual(definition); expect(first.assessment_rubric_snapshot_json).toEqual(rubric);
      const updated = { ...definition, description: "Republished definition" };
      await pool.query("update public.simulator_scenario_parameters set definition_json=$2 where id=$1", [source.id, updated]);
      expect((await pool.query("select definition_snapshot_json from public.simulator_review_scenario_assignments where id=$1", [first.id])).rows[0].definition_snapshot_json).toEqual(definition);
      expect((await publish(revision + 1)).status).toBe(200);
      const second = (await pool.query("select * from public.simulator_review_scenario_assignments where scenario_parameters_id=$1", [source.id])).rows[0];
      expect(second.definition_snapshot_json).toEqual(updated); expect(second.assessment_rubric_snapshot_json).toBeNull();
      const memberships = (await pool.query("select revision_number,definition_json,assessment_rubric_json from public.simulator_scenario_library_memberships where scenario_parameters_id=$1 order by revision_number", [source.id])).rows;
      expect(memberships.map(m => m.revision_number)).toEqual([1, 2, 3]);
      expect(memberships[1].assessment_rubric_json).toEqual(rubric); expect(memberships[2].assessment_rubric_json).toBeNull();
    } finally { globalThis.cnsSimulatorDatabasePool = previous; }
  });
  it("does not allow a published exam snapshot to be relabelled as practice", async () => {
    const { membership } = await published("exam");
    await expect(pool.query("update public.simulator_scenario_library_memberships set library_kind='practice' where id=$1", [membership.id])).rejects.toMatchObject({ code: "23514" });
    await expect(pool.query("update public.simulator_scenario_library_memberships set scenario_id='other-id' where id=$1", [membership.id])).rejects.toMatchObject({ code: "23514" });
  });
  it("freezes rubric on publication and invalidates only mutable source edits", async () => {
    const { source, membership, definition } = await published();
    expect(membership.assessment_rubric_json).toEqual(rubric);
    await pool.query("update public.simulator_scenario_parameters set definition_json=$2 where id=$1", [source.id, { ...definition, description: "changed after publication" }]);
    expect((await pool.query("select assessment_rubric_json from public.simulator_scenario_parameters where id=$1", [source.id])).rows[0].assessment_rubric_json).toBeNull();
    expect((await pool.query("select assessment_rubric_json from public.simulator_scenario_library_memberships where id=$1", [membership.id])).rows[0].assessment_rubric_json).toEqual(rubric);
    await expect(pool.query("update public.simulator_scenario_library_memberships set assessment_rubric_json=null where id=$1", [membership.id])).rejects.toMatchObject({ code: "23514" });
  });
});
