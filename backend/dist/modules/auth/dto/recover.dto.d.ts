export declare class RecoverGetQuestionsDto {
    email: string;
}
export declare class RecoverAnswerDto {
    question: string;
    answer: string;
}
export declare class RecoverVerifyDto {
    email: string;
    answers: RecoverAnswerDto[];
}
export declare class RecoverResetDto {
    recoveryToken: string;
    newPassword: string;
}
