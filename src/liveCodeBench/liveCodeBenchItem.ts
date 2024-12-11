// import * as base64 from "base64-js";
import * as fs from "fs";
import { createInterface } from "readline";

// import * as zlib from "zlib";

export interface LiveCodeBenchItem {
    problemTitle: string;
    problemStatement: string;
    platform: string;
    questionId: string;
    contestId: string;
    contestDate: Date;
    starterCode: string;
    difficulty: string;
    publicTestCases: TestCase[];
    privateTestCases: TestCase[];
    metadata: any;
}

export interface TestCase {
    input: string;
    output: string;
    testType: string;
}

export class LazyDatasetLoader {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    public async *loadItems(): AsyncGenerator<LiveCodeBenchItem> {
        const fileStream = fs.createReadStream(this.filePath);
        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            try {
                const trimmedLine = line.trim();
                if (!trimmedLine) {
                    console.warn("Skipping empty or whitespace-only line");
                    continue;
                }

                const data = JSON.parse(trimmedLine);

                yield this.createLazyItem(data);
            } catch (err) {
                console.error("Error processing line:", line, err);
            }
        }
    }

    private createLazyItem(data: any): LiveCodeBenchItem {
        return new Proxy<LiveCodeBenchItem>(
            {
                problemTitle: data.question_title,
                problemStatement: data.question_content,
                platform: data.platform,
                questionId: data.question_id,
                contestId: data.contest_id,
                contestDate: new Date(data.contest_date),
                starterCode: data.starter_code,
                difficulty: data.difficulty,
                publicTestCases: this.parseJSONSafe(data.public_test_cases),
                privateTestCases: [],
                metadata: this.parseJSONSafe(data.metadata),
            },
            {
                get: (target, prop) => {
                    if (
                        prop === "privateTestCases" &&
                        target.privateTestCases.length === 0
                    ) {
                        target.privateTestCases =
                            // LazyDatasetLoader.decodePrivateTestCases(
                            //     data.private_test_cases
                            // );
                            [];
                    }
                    return target[prop as keyof LiveCodeBenchItem];
                },
            }
        );
    }

    private parseJSONSafe(jsonString: string): any {
        try {
            const parsedData = JSON.parse(jsonString);
            return Array.isArray(parsedData)
                ? parsedData.map((item) => ({
                      input: item["input"],
                      output: item["output"],
                      testType: item["testtype"],
                  }))
                : [];
        } catch (e) {
            return [];
        }
    }

    // private static decodePrivateTestCases(
    //     encodedTestCases: string | undefined | null
    // ): TestCase[] {
    //     if (!encodedTestCases) {
    //         console.warn("Warning: Encoded test cases are null or undefined.");
    //         return [];
    //     }

    //     try {
    //         const byteArray = base64.toByteArray(encodedTestCases);
    //         let decompressedData;
    //         try {
    //             decompressedData = zlib.inflateSync(byteArray);
    //         } catch (inflateError) {
    //             console.warn("Inflate failed, trying unzip:", inflateError);
    //             decompressedData = zlib.unzipSync(byteArray);
    //         }

    //         let decompressedDataString = decompressedData.toString("utf-8");

    //         const startIndex = decompressedDataString.indexOf("[");
    //         const endIndex = decompressedDataString.lastIndexOf("]");

    //         if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    //             decompressedDataString = decompressedDataString.slice(
    //                 startIndex,
    //                 endIndex + 1
    //             );
    //         } else {
    //             console.warn(
    //                 "Warning: Brackets not found or out of order in decompressed data"
    //             );
    //         }
    //         return JSON.parse(decompressedDataString) as TestCase[];
    //     } catch (e) {
    //         console.error("Failed to decode private test cases. Error:", e);
    //         return [];
    //     }
    // }
}
