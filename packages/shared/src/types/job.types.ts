export type JobType = 'metadata' | 'ocr' | 'analysis';
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface Job {
    id: string;
    type: JobType;
    documentId?: number;
    documentIds?: number[];
    status: JobStatus;
    progress: number; // 0–100
    error?: string;
    createdAt: string;
    completedAt?: string;
}

export interface MetadataJobData {
    documentId: number;
    mode: 'manual' | 'auto';
    stages: string[];
}

export interface OcrJobData {
    documentId: number;
    processMode: 'image' | 'pdf' | 'whole_pdf';
    limitPages: number;
}

export interface AnalysisJobData {
    documentIds: number[];
    prompt: string;
    language: string;
}

export type JobData = MetadataJobData | OcrJobData | AnalysisJobData;
