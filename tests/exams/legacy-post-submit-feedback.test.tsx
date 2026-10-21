import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StudentSubjectProgress, type StudentAttemptView } from "@/components/exams/student-subject-progress";
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/exams/actions",()=>({completeExamAttemptAction:vi.fn(),startExamAttemptAction:vi.fn()}));
vi.mock("@/components/scenario/attempt-feedback-result",()=>({AttemptFeedbackResult:(props:{target:{legacyAttemptItemId:string}})=>{mocks.read(props);return <div data-testid="legacy-feedback">{props.target.legacyAttemptItemId}</div>;}}));
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
const attempt:StudentAttemptView={id:"attempt",status:"in_progress",items:[{id:"one",moduleCode:"ads-b",scenarioTitle:"First exercise",position:1,status:"submitted"},{id:"two",moduleCode:"dme",scenarioTitle:"Second exercise",position:2,status:"in_progress"}]};
function view(value:StudentAttemptView){return <StudentSubjectProgress examId="exam" candidateSubjectId="subject" subjectName="CNS" paperTitle="Training exam" attempt={value}/>;}
it("does not request legacy feedback while the overall attempt is still in progress",()=>{
 const {rerender}=render(view(attempt));expect(mocks.read).not.toHaveBeenCalled();
 rerender(view({...attempt,items:attempt.items.map(item=>({...item,status:"submitted"}))}));
 expect(mocks.read).not.toHaveBeenCalled();expect(screen.queryByTestId("legacy-feedback")).not.toBeInTheDocument();
});
it("reads saved feedback only for a fully submitted legacy attempt",()=>{
 render(view({...attempt,status:"submitted",items:attempt.items.map(item=>({...item,status:"submitted"}))}));
 expect(screen.getAllByTestId("legacy-feedback")).toHaveLength(2);
 expect(mocks.read.mock.calls.map(([props])=>props.target)).toEqual([{legacyAttemptItemId:"one"},{legacyAttemptItemId:"two"}]);
});
it("does not carry legacy feedback into a new in-progress attempt",()=>{
 const {rerender}=render(view({...attempt,status:"submitted",items:attempt.items.map(item=>({...item,status:"submitted"}))}));
 expect(screen.getAllByTestId("legacy-feedback")).toHaveLength(2);
 rerender(view({...attempt,id:"next-attempt"}));expect(screen.queryByTestId("legacy-feedback")).not.toBeInTheDocument();
});
