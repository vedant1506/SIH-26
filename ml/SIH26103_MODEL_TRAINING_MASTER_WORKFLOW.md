# SIH26103 --- MODEL TRAINING MASTER WORKFLOW

## Web-Based Integrated Project-Monitoring Platform

### AI/ML Team --- Google Colab + XGBoost + SHAP + Hugging Face

------------------------------------------------------------------------

# 0. PURPOSE OF THIS FILE

This is the **master instruction file for the AI/ML model-training
team** working on:

**SIH26103 --- Web-Based Integrated Project-Monitoring Platform**

Our responsibility is ONLY:

``` text
PAIMANA 2023–2026 data
        ↓
Data extraction
        ↓
Data cleaning & validation
        ↓
Project history construction
        ↓
Target creation
        ↓
Feature engineering
        ↓
Temporal train/validation/test split
        ↓
XGBoost prediction models
        ↓
SHAP explainability
        ↓
Risk scoring
        ↓
LLM dataset creation
        ↓
Hugging Face LoRA/QLoRA fine-tuning
        ↓
Model evaluation
        ↓
Final model package
```

We are NOT responsible for:

-   Next.js frontend
-   FastAPI production API
-   Supabase application integration
-   Authentication
-   Production deployment

Other team members may integrate our models later.

------------------------------------------------------------------------

# 1. MASTER INSTRUCTION FOR CLAUDE / CHATGPT

You are the **Lead AI/ML Engineer and ML Research Assistant** for
SIH26103.

The team has official PAIMANA project-monitoring data/reports from
**2023--2026** supplied for the SIH project.

Your job is to build a scientifically valid AI/ML pipeline using
**Google Colab**, with:

-   Python
-   Pandas
-   NumPy
-   Scikit-learn
-   XGBoost
-   SHAP
-   Hugging Face Transformers
-   PEFT
-   LoRA/QLoRA
-   TRL where appropriate
-   bitsandbytes where appropriate

Follow this document **phase by phase**.

## Critical instruction

**Do NOT jump directly to LLM fine-tuning.**

First establish the quality of the PAIMANA dataset.

Then build the longitudinal project dataset.

Then define future targets.

Then prevent temporal leakage.

Then train XGBoost models.

Then evaluate them.

Then implement SHAP.

Only after the structured ML pipeline is validated should we create the
LLM fine-tuning dataset and evaluate LoRA/QLoRA.

------------------------------------------------------------------------

# 2. NON-NEGOTIABLE RULES

## 2.1 Data integrity

Never:

-   fabricate PAIMANA records
-   fabricate project IDs
-   fabricate project history
-   fabricate missing values
-   invent dates
-   invent costs
-   invent project progress
-   invent model metrics
-   claim code executed successfully when it was not executed

Always use the actual uploaded/project data.

Preserve raw data separately.

------------------------------------------------------------------------

# 3. MACHINE-LEARNING RULES

## 3.1 Temporal prediction

This is a project-monitoring forecasting problem.

At prediction time `T`:

``` text
FEATURES = information available at or before T

TARGET = an outcome occurring after T
```

Never use future information as a feature.

Example:

If predicting whether a project will become delayed after March 2025:

``` text
Allowed:
January 2025 information
February 2025 information
March 2025 information

Not allowed:
April 2025 information
May 2025 information
Final revised completion date
Future expenditure
Future physical progress
```

unless those values are genuinely available at prediction time.

------------------------------------------------------------------------

# 4. PRIMARY MODEL ARCHITECTURE

The core predictive architecture is:

``` text
PAIMANA historical observations
            ↓
    Feature Engineering
            ↓
       XGBoost Model
       /           \
      ↓             ↓
Delay Prediction   Cost Risk
      \             /
       \           /
          ↓
         SHAP
          ↓
   Risk Explanation
```

The LLM is NOT the primary numerical predictor.

The LLM is used for natural-language explanation and project
intelligence.

------------------------------------------------------------------------

# 5. RECOMMENDED GOOGLE COLAB PROJECT STRUCTURE

Create:

``` text
SIH26103_ML/
│
├── data/
│   ├── raw/
│   │   ├── 2023/
│   │   ├── 2024/
│   │   ├── 2025/
│   │   └── 2026/
│   │
│   ├── extracted/
│   ├── processed/
│   └── final/
│
├── notebooks/
│   ├── 01_environment.ipynb
│   ├── 02_data_inventory.ipynb
│   ├── 03_pdf_extraction.ipynb
│   ├── 04_data_cleaning.ipynb
│   ├── 05_project_linking.ipynb
│   ├── 06_target_creation.ipynb
│   ├── 07_feature_engineering.ipynb
│   ├── 08_temporal_split.ipynb
│   ├── 09_delay_xgboost.ipynb
│   ├── 10_cost_xgboost.ipynb
│   ├── 11_shap.ipynb
│   ├── 12_risk_engine.ipynb
│   ├── 13_llm_dataset.ipynb
│   ├── 14_llm_finetuning.ipynb
│   └── 15_final_evaluation.ipynb
│
├── models/
│   ├── delay/
│   ├── cost/
│   ├── preprocessors/
│   └── llm/
│
├── metrics/
├── explanations/
├── logs/
└── docs/
```

------------------------------------------------------------------------

# PHASE 0 --- GOOGLE COLAB ENVIRONMENT

## Objective

Create a reproducible ML environment.

## Prompt to Claude/ChatGPT

``` text
Start Phase 0 — Google Colab Environment Setup.

We are building the AI/ML component of SIH26103.

Our environment is Google Colab.

Create the first notebook.

Requirements:

1. Check Python version.
2. Check available RAM.
3. Check disk space.
4. Detect GPU.
5. Display GPU name and VRAM.
6. Display CUDA information if available.
7. Install required ML packages.
8. Print installed versions.
9. Set reproducibility seeds.
10. Create the SIH26103_ML directory structure.
11. Create a configuration section.
12. Create a basic logging system.

Required packages should include only what is actually needed.

Do not train anything.

Do not download a large LLM yet.

At the end provide a system report.

Wait for validation before moving to Phase 1.
```

## Save

``` text
environment_report.txt
requirements.txt
```

------------------------------------------------------------------------

# PHASE 1 --- DATA INVENTORY

## Objective

Understand the actual 2023--2026 PAIMANA files before writing extraction
code.

## Prompt

``` text
Start Phase 1 — PAIMANA Data Inventory.

I have official PAIMANA project-monitoring reports/data from 2023–2026.

Inspect the actual files available in the project.

Do NOT assume the report format is identical across all years.

For every file determine:

1. filename
2. year
3. reporting period/date
4. page count
5. file type
6. report structure
7. project-level tables
8. table headers
9. project ID/code
10. project name
11. state
12. department/agency
13. sector/category if available
14. start date
15. original completion date
16. revised completion date
17. original cost
18. revised cost
19. expenditure
20. physical progress
21. other potentially useful fields

Identify:

- duplicate files
- duplicate reports
- format changes
- missing reports/months
- missing fields
- inconsistent column names
- project identifier consistency
- extraction risks

Create:

file_inventory.csv
data_dictionary.csv
report_format_summary.csv

Show representative examples from the actual data.

Do not clean or model the data yet.

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 2 --- DATA EXTRACTION

## Objective

Convert project-level report information into structured records.

## Prompt

``` text
Start Phase 2 — PAIMANA Data Extraction.

Use the actual report structures identified in Phase 1.

Build a robust extraction pipeline in Google Colab.

Extract project-level observations.

Minimum fields:

source_file
source_page
report_year
report_month
report_date
project_id
project_name
state
agency
sector
start_date
original_completion_date
revised_completion_date
original_cost
revised_cost
cumulative_expenditure
physical_progress

Keep additional useful fields if present.

Handle:

- multi-page tables
- repeated headers
- page breaks
- multi-line project names
- commas in numbers
- percentage fields
- blank values
- "-"
- NA markers
- footers
- headers
- subtotal rows
- total rows

Do NOT include:
- state totals
- ministry totals
- sector totals
- grand totals
- page numbers
- summary rows

Do not fabricate missing information.

Create:

paimana_raw.csv
extraction_quality_report.csv

Report:

- total extracted rows
- unique project IDs
- records per year
- records per report
- missing values
- duplicate records
- parsing failures
- suspicious records

Show 20 actual extracted rows.

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 3 --- DATA CLEANING AND VALIDATION

## Objective

Create a reliable structured dataset while preserving the raw data.

## Prompt

``` text
Start Phase 3 — Data Cleaning and Validation.

Use paimana_raw.csv.

Never modify the original raw file.

Create a cleaned dataset.

Tasks:

1. Standardize column names.
2. Standardize date formats.
3. Convert numeric fields safely.
4. Convert percentages to numeric representation.
5. Normalize project IDs without destroying their original value.
6. Normalize text fields.
7. Identify duplicate project observations.
8. Identify impossible values.
9. Identify missing values.
10. Identify suspicious values.
11. Record every transformation.

Examples of validation:

physical_progress should be within a reasonable percentage range.

Costs should not be negative.

Dates should be valid.

Original completion should not be nonsensical relative to start date.

Do not automatically delete suspicious records.

Create a data-quality flag where appropriate.

Create:

paimana_clean.csv
data_quality_report.csv
cleaning_log.csv

Do not perform ML yet.
```

------------------------------------------------------------------------

# PHASE 4 --- PROJECT LINKING / LONGITUDINAL DATASET

## Objective

Connect observations of the same project across different reports.

## Prompt

``` text
Start Phase 4 — Longitudinal Project Linking.

Build project history from the cleaned PAIMANA observations.

Use project_id/project_code as the primary matching key whenever available.

Do not match projects only by project name.

Analyze:

1. project IDs appearing in multiple reports
2. projects appearing only once
3. duplicate IDs
4. formatting differences
5. project name changes
6. missing monthly observations
7. projects with long histories
8. projects with short histories

Sort:

project_id → report_date

For each project calculate:

observation_count
first_observation_date
last_observation_date
history_length
missing_observation_count

Do NOT fabricate missing observations.

Do NOT automatically forward-fill future-sensitive fields.

Create:

project_history.csv
project_continuity_report.csv

Show:

- 10 projects with long histories
- 10 projects with short histories
- examples of missing observations
- problematic IDs

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 5 --- TARGET DESIGN

## Objective

Define exactly what the model predicts.

This is one of the most important phases.

## Prompt

``` text
Start Phase 5 — Future Target Design.

We need to predict future project-monitoring outcomes.

Design targets for:

A. Future schedule delay
B. Future cost overrun

At prediction time T, only information available at T may be used as features.

Analyze possible targets.

For schedule:

1. future delayed/not delayed
2. future delay duration
3. probability of becoming delayed within a defined horizon

For cost:

1. future cost overrun/not overrun
2. future cost overrun percentage
3. future cost growth

For every target provide:

- exact definition
- formula
- required columns
- prediction horizon
- advantages
- disadvantages
- class distribution expectation
- leakage risks

Recommend the strongest targets supported by the actual dataset.

Do not create synthetic labels.

Do not use future information as features.

First produce target definitions.

Do not write target-generation code until the definitions are reviewed.
```

------------------------------------------------------------------------

# PHASE 6 --- TARGET CREATION

## Prompt

``` text
Start Phase 6 — Target Generation.

Use the approved target definitions from Phase 5.

For every observation at time T:

FEATURES must only use information available <= T.

TARGET must use information after T.

Create target-generation code.

Generate:

model_dataset_before_features.parquet

For every target include:

target_name
target_definition
prediction_horizon
target_value
target_source_date

Perform leakage checks.

Report:

- target distribution
- positive/negative counts
- missing targets
- projects with insufficient future history
- target generation failures

Do not train models.

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 7 --- FEATURE ENGINEERING

## Objective

Build predictive features from information known at prediction time.

## Prompt

``` text
Start Phase 7 — Feature Engineering.

Create model features using only historical/current information available at the prediction date.

Candidate features include:

Project characteristics:
- project scale
- state
- agency
- sector
- original cost
- planned duration

Current status:
- physical progress
- cumulative expenditure
- elapsed duration
- elapsed percentage

Trend features:
- progress velocity
- expenditure velocity
- recent progress change
- recent expenditure change
- progress acceleration where data supports it

Gap features:
- expected progress versus actual progress
- expenditure versus physical progress
- schedule gap

Cost features:
- expenditure ratio
- cost growth where legitimately available
- revised/original cost ratio only when the revised value was already known at prediction time

Historical features:
- previous progress
- previous expenditure
- previous risk indicators
- number of prior observations

For EVERY feature provide:

feature_name
formula
source_columns
meaning
data_type
allowed_at_prediction_time
leakage_risk

Do not blindly create every candidate feature.

Remove features that contain future information.

Create:

feature_dictionary.csv
model_ready_dataset.parquet

Run:

- missing-value analysis
- outlier analysis
- impossible-value analysis
- leakage scan
- duplicate scan

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 8 --- TEMPORAL TRAIN / VALIDATION / TEST SPLIT

## Objective

Build a correct time-aware evaluation strategy.

## Prompt

``` text
Start Phase 8 — Temporal Dataset Split.

This is a historical forecasting problem.

Do NOT use a random train_test_split as the primary evaluation method.

Inspect the actual date range.

Create chronological:

TRAIN
VALIDATION
TEST

The training period must occur before validation.

Validation must occur before test.

Analyze project-level overlap.

If the same project appears across splits, verify that earlier observations are used only for earlier prediction periods and later observations are used only for later prediction periods.

Also consider a strict project-holdout experiment if supported by the dataset.

Report:

- row count per split
- unique project count
- date range
- target distribution
- repeated-project overlap
- leakage checks

Save:

train.parquet
validation.parquet
test.parquet

Prove that test information was not used during feature engineering or model tuning.
```

------------------------------------------------------------------------

# PHASE 9 --- BASELINE MODELS

## Objective

Establish a benchmark before XGBoost.

## Prompt

``` text
Start Phase 9 — Baseline Models.

Before training XGBoost, create simple baseline models appropriate for the approved target.

Examples may include:

- majority-class classifier
- logistic regression
- simple tree model
- simple regression baseline

Choose baselines based on the actual target.

Evaluate on validation and test as appropriate.

Record:

precision
recall
F1
ROC-AUC where appropriate
PR-AUC where appropriate
MAE/RMSE where appropriate
confusion matrix

Do not tune baselines using test data.

Create:

baseline_metrics.json
baseline_comparison.csv

The purpose is to prove whether XGBoost actually adds value.
```

------------------------------------------------------------------------

# PHASE 10 --- XGBOOST DELAY MODEL

## Objective

Train the primary schedule-delay prediction model.

## Prompt

``` text
Start Phase 10 — XGBoost Delay Model.

Train an XGBoost model for the approved future-delay target.

Requirements:

1. Use only approved features.
2. Use temporal train/validation/test splits.
3. Handle class imbalance when required.
4. Do not oversample across temporal boundaries.
5. Tune hyperparameters using training and validation only.
6. Never tune using the test set.
7. Use reproducible random seeds.
8. Save the exact feature list.
9. Save preprocessing requirements.
10. Record all hyperparameters.

Evaluate:

- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- confusion matrix
- calibration if appropriate

Pay particular attention to recall for delayed/high-risk projects.

Compare against the baseline.

Create:

models/delay/delay_xgboost.json
models/delay/feature_columns.json
models/delay/metadata.json
metrics/delay_metrics.json

Do not claim the model is good without test evidence.

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 11 --- XGBOOST COST MODEL

## Objective

Train the future cost-overrun model.

## Prompt

``` text
Start Phase 11 — XGBoost Cost-Overrun Model.

Train an XGBoost model for the approved future cost-overrun target.

Use only information available at prediction time.

Pay special attention to:

- revised cost leakage
- future expenditure leakage
- final cost leakage
- future completion information

Use temporal train/validation/test splits.

Tune only using training and validation.

Evaluate:

- precision
- recall
- F1
- ROC-AUC where appropriate
- PR-AUC where appropriate
- confusion matrix
- calibration where appropriate

Compare against the baseline.

Create:

models/cost/cost_xgboost.json
models/cost/feature_columns.json
models/cost/metadata.json
metrics/cost_metrics.json

Stop for validation.
```

------------------------------------------------------------------------

# PHASE 12 --- HYPERPARAMETER TUNING

## Objective

Optimize models without leaking test information.

## Prompt

``` text
Start Phase 12 — Hyperparameter Tuning.

Tune the approved XGBoost models.

Use training and validation only.

Possible parameters:

n_estimators
max_depth
learning_rate
subsample
colsample_bytree
min_child_weight
gamma
reg_alpha
reg_lambda

Do not blindly search a huge parameter space.

Use an efficient search strategy appropriate for Google Colab.

Prevent overfitting.

Compare tuned model against:

1. baseline
2. untuned XGBoost

Only after finalizing the model may the untouched test set be evaluated.

Record:

best parameters
validation metrics
training time
model size

Save experiment logs.

Do not modify the test set based on results.
```

------------------------------------------------------------------------

# PHASE 13 --- FINAL TEST EVALUATION

## Prompt

``` text
Start Phase 13 — Final Test Evaluation.

The model and threshold are now frozen.

Evaluate on the untouched test set.

For classification report:

- accuracy
- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- confusion matrix

If probability calibration is appropriate, evaluate calibration.

Also report:

- false positives
- false negatives
- performance by risk class
- performance by relevant project groups where sample size supports it

For every metric explain what it means for project monitoring.

Do not modify the model after seeing test results.

Create:

final_test_metrics.json
final_confusion_matrix.png
model_comparison.csv

Clearly state limitations.
```

------------------------------------------------------------------------

# PHASE 14 --- SHAP EXPLAINABILITY

## Objective

Explain actual XGBoost predictions.

## Prompt

``` text
Start Phase 14 — SHAP Explainability.

Use the final trained XGBoost models.

Implement:

1. global SHAP feature importance
2. SHAP summary plot
3. SHAP bar plot
4. individual project explanation
5. top risk-increasing features
6. top risk-decreasing features

For an individual project return:

{
  "project_id": "...",
  "prediction": ...,
  "probability": ...,
  "top_risk_drivers": [
    {
      "feature": "...",
      "value": ...,
      "shap_value": ...,
      "direction": "increases/decreases risk"
    }
  ]
}

Explanations must come from actual SHAP values.

Do not invent explanations.

Generate explanations for unseen test projects.

Save:

explanations/global/
explanations/project_level/

Create:

shap_summary.png
shap_feature_importance.csv
project_explanations.json
```

------------------------------------------------------------------------

# PHASE 15 --- RISK SCORING

## Objective

Convert model outputs into useful risk categories.

## Prompt

``` text
Start Phase 15 — Risk Scoring.

Design a deterministic risk scoring system using validated model outputs.

Potential inputs:

delay probability
cost-overrun probability
predicted magnitude where supported
model calibration
business impact where data supports it

Risk levels:

LOW
MEDIUM
HIGH
CRITICAL

Do not choose thresholds arbitrarily.

Use validation data to recommend thresholds.

Explain:

- threshold selection
- false-negative implications
- false-positive implications
- calibration
- risk interpretation

Create:

calculate_risk()

Return:

{
  "project_id": "...",
  "delay_probability": ...,
  "cost_overrun_probability": ...,
  "risk_score": ...,
  "risk_level": "...",
  "top_risk_drivers": [...]
}

The LLM must NOT override the deterministic risk engine.

Save:

risk_thresholds.json
risk_engine.py
risk_validation_report.md
```

------------------------------------------------------------------------

# PHASE 16 --- WHAT-IF MODEL SIMULATION

## Objective

Allow controlled changes to current project features and compare
predictions.

## Prompt

``` text
Start Phase 16 — What-If Simulation.

Build a safe model simulation function.

Input:
current project observation

Allow only approved model features to be changed.

For example, where valid:

physical_progress
expenditure
other current measurable indicators

Process:

1. calculate current prediction
2. modify selected feature
3. validate the new value
4. calculate simulated prediction
5. compare before and after

Return:

{
  "before": {...},
  "changed_features": {...},
  "after": {...},
  "prediction_change": {...}
}

Reject impossible values.

Clearly state that this is a model simulation, not a guaranteed real-world result.

Do not allow changes to features that would introduce future information.
```

------------------------------------------------------------------------

# PHASE 17 --- MODEL EXPORT

## Objective

Package models for the backend team.

## Prompt

``` text
Start Phase 17 — Production Model Export.

Prepare the final structured ML models for use by another team.

Export:

Delay model
Cost model
Preprocessing objects if required
Feature lists
Risk thresholds
Model metadata
SHAP configuration

Create:

predict.py

Functions:

predict_delay(project_data)
predict_cost(project_data)
predict_risk(project_data)
explain_project(project_data)

Return structured results.

Test by:

1. loading the saved models
2. loading preprocessing
3. running inference
4. generating SHAP
5. calculating risk

Use unseen test examples.

Create:

models/
metrics/
explanations/
docs/model_card.md

Record:

dataset version
feature version
target version
model version
training date
hyperparameters
metrics
thresholds
software versions

Stop only after reload testing succeeds.
```

------------------------------------------------------------------------

# PHASE 18 --- LLM DATASET DESIGN

## IMPORTANT

The PAIMANA dataset is a **structured project-monitoring dataset**.

It is NOT automatically a suitable LLM fine-tuning dataset.

The LLM training dataset should consist of high-quality
instruction/response examples grounded in verified project information.

## Prompt

``` text
Start Phase 18 — LLM Fine-Tuning Dataset Design.

We have completed and validated the structured XGBoost + SHAP pipeline.

Now design an instruction-following dataset for a Project Risk Intelligence Assistant.

The LLM should learn response behavior such as:

1. explaining project risk
2. explaining delay prediction
3. explaining cost-overrun prediction
4. explaining SHAP drivers
5. summarizing project status
6. summarizing project history
7. identifying monitoring priorities
8. answering structured project questions
9. producing concise executive summaries
10. explaining what-if simulation results

Do NOT simply convert every PAIMANA row into an LLM training example.

Use verified:
- project observations
- historical trends
- XGBoost outputs
- SHAP outputs
- deterministic risk outputs

Do not use test examples in training.

Do not expose future outcomes in training contexts where they would create leakage.

Create an instruction dataset.

Before generating examples, define the exact schema.
```

------------------------------------------------------------------------

# PHASE 19 --- LLM TRAINING DATA GENERATION

## Prompt

``` text
Start Phase 19 — LLM Fine-Tuning Dataset Generation.

Create high-quality conversational examples.

Preferred format:

{
  "messages": [
    {
      "role": "user",
      "content": "Explain the current risk of this project using the verified information."
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ]
}

Create examples covering:

- risk explanation
- delay explanation
- cost explanation
- SHAP explanation
- project summary
- trend explanation
- monitoring priority
- structured Q&A

Requirements:

- factual grounding
- no fabricated information
- no unsupported claims
- no test-set leakage
- task diversity
- response consistency
- concise professional language

Create:

llm_train.jsonl
llm_validation.jsonl
llm_test.jsonl

Report:

- total examples
- examples per task
- examples per risk level
- duplicate count
- average length
- maximum length
- suspicious examples
- leakage risks

Stop before fine-tuning.
```

------------------------------------------------------------------------

# PHASE 20 --- LLM MODEL SELECTION

## Objective

Select an appropriate open-weight Hugging Face instruction model for
Colab.

## Prompt

``` text
Start Phase 20 — Hugging Face Model Selection.

Inspect the actual Google Colab hardware:

- GPU
- VRAM
- RAM
- disk
- CUDA

Then compare realistic open-weight instruction-following models available through Hugging Face.

Evaluate:

- model size
- VRAM requirement
- QLoRA compatibility
- instruction following
- multilingual support if needed
- license
- Colab feasibility
- inference cost
- expected fine-tuning time

Recommend the smallest realistic model that meets our needs.

Do not download or train a model until the selection is justified.

Prefer LoRA/QLoRA rather than full fine-tuning for limited Colab resources.
```

------------------------------------------------------------------------

# PHASE 21 --- LLM BASELINE EVALUATION

## IMPORTANT

Evaluate the base model BEFORE fine-tuning.

## Prompt

``` text
Start Phase 21 — Base LLM Evaluation.

Load the selected Hugging Face instruction model.

Evaluate it on the held-out LLM test dataset before fine-tuning.

Test:

1. factual grounding
2. instruction following
3. project-risk explanation
4. SHAP explanation
5. hallucination
6. structured output
7. response consistency
8. latency

Create a manual/automated evaluation framework.

Record baseline results.

Do not fine-tune yet.

Save:

llm_base_evaluation.json
```

------------------------------------------------------------------------

# PHASE 22 --- LORA/QLORA FINE-TUNING

## Objective

Fine-tune the selected LLM using Google Colab.

## Prompt

``` text
Start Phase 22 — LoRA/QLoRA Fine-Tuning.

Use:

- approved Hugging Face instruction model
- approved LLM training dataset
- validation dataset
- Google Colab GPU

Use appropriate tools:

Transformers
PEFT
LoRA/QLoRA
TRL where appropriate
bitsandbytes where appropriate

Build a complete reproducible notebook.

Steps:

1. verify GPU
2. install compatible dependencies
3. load tokenizer
4. load base model
5. configure quantization if using QLoRA
6. load train dataset
7. load validation dataset
8. validate dataset schema
9. configure LoRA
10. configure training
11. train
12. monitor training loss
13. monitor validation loss
14. save adapter
15. reload adapter
16. run inference
17. evaluate unseen test examples

Record:

learning_rate
batch_size
gradient_accumulation
epochs
sequence_length
LoRA rank
LoRA alpha
LoRA dropout
optimizer
warmup
training steps

Do not train on the test dataset.

If GPU memory fails, inspect the actual memory issue and adjust configuration systematically.

Do not claim successful training unless the notebook actually completes.
```

------------------------------------------------------------------------

# PHASE 23 --- FINE-TUNED LLM EVALUATION

## Prompt

``` text
Start Phase 23 — Fine-Tuned LLM Evaluation.

Evaluate the fine-tuned model on the same held-out test dataset used for baseline comparison.

Compare:

BASE MODEL
vs
FINE-TUNED MODEL

Evaluate:

1. factual correctness
2. hallucination rate
3. project-risk explanation
4. delay explanation
5. cost explanation
6. SHAP explanation fidelity
7. instruction following
8. structured output compliance
9. consistency
10. latency

Do not use training examples for final evaluation.

Create:

llm_comparison.csv
llm_final_evaluation.json

Only claim fine-tuning improved the system if the evidence supports it.

If fine-tuning provides little benefit, recommend base model + RAG instead.
```

------------------------------------------------------------------------

# PHASE 24 --- HALLUCINATION / GROUNDING TEST

## Prompt

``` text
Start Phase 24 — LLM Grounding and Hallucination Test.

Create adversarial tests.

Test questions such as:

1. asking for information not present
2. asking for a fabricated project ID
3. asking for future information
4. asking the model to change the official risk
5. asking the model to ignore SHAP
6. asking for unsupported causes
7. asking about missing data
8. conflicting information

The assistant should:

- use verified information
- say when information is unavailable
- never invent project facts
- never override XGBoost
- never override the deterministic risk engine

Record failures.

Create:

llm_grounding_report.md
```

------------------------------------------------------------------------

# PHASE 25 --- FINAL ML PIPELINE TEST

## Prompt

``` text
Start Phase 25 — End-to-End ML Validation.

Test the complete AI/ML pipeline:

PAIMANA data
→ extraction
→ cleaning
→ project linking
→ target creation
→ feature engineering
→ temporal split
→ XGBoost
→ SHAP
→ risk engine
→ LLM dataset
→ LLM
→ final response

Use actual project data.

Select representative unseen test projects.

For each test project verify:

1. project history
2. input features
3. delay prediction
4. cost prediction
5. risk score
6. SHAP drivers
7. natural-language explanation

Create:

final_ml_validation_report.md

Do not modify the model based on the final test examples.
```

------------------------------------------------------------------------

# PHASE 26 --- INDEPENDENT ML AUDIT

## Prompt

``` text
Act as an independent ML reviewer.

Audit the entire SIH26103 AI/ML pipeline.

Check:

DATA:
- extraction correctness
- duplicates
- missing values
- project linking

TARGET:
- future outcome definition
- target correctness
- temporal leakage

FEATURES:
- target leakage
- future leakage
- invalid transformations

SPLITS:
- chronological ordering
- project overlap
- test isolation

XGBOOST:
- overfitting
- class imbalance
- baseline comparison
- threshold selection

EVALUATION:
- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- calibration

SHAP:
- correctness
- feature interpretation
- local explanations

RISK ENGINE:
- threshold justification
- consistency

LLM:
- dataset quality
- hallucination
- grounding
- base vs fine-tuned comparison

Be critical.

Do not hide weaknesses.

Classify findings:

CRITICAL
HIGH
MEDIUM
LOW

Create:

docs/ml_audit.md
```

------------------------------------------------------------------------

# PHASE 27 --- FINAL MODEL PACKAGE

The final AI/ML team must deliver:

``` text
SIH26103_ML_FINAL/
│
├── data/
│   ├── data_dictionary.csv
│   ├── feature_dictionary.csv
│   └── dataset_statistics.csv
│
├── models/
│   ├── delay_xgboost/
│   ├── cost_xgboost/
│   └── llm/
│
├── preprocessors/
│
├── shap/
│   ├── global/
│   └── project_level/
│
├── risk_engine/
│   ├── risk_engine.py
│   └── risk_thresholds.json
│
├── llm_dataset/
│   ├── train.jsonl
│   ├── validation.jsonl
│   └── test.jsonl
│
├── metrics/
│   ├── baseline.json
│   ├── delay.json
│   ├── cost.json
│   └── llm.json
│
├── notebooks/
│
└── docs/
    ├── model_card.md
    ├── training_report.md
    ├── ml_audit.md
    └── limitations.md
```

------------------------------------------------------------------------

# 28. MODEL CARD REQUIREMENTS

Create `model_card.md`.

Include:

## Model name

SIH26103 Project Risk Prediction Model

## Models

-   XGBoost Delay Model
-   XGBoost Cost-Overrun Model
-   Optional Hugging Face LoRA/QLoRA LLM

## Dataset

PAIMANA project-monitoring data, 2023--2026.

## Features

List all final features.

## Targets

Define each target precisely.

## Training

Include:

-   date range
-   train period
-   validation period
-   test period
-   hyperparameters

## Metrics

Include actual measured metrics.

Never invent metrics.

## Limitations

Document:

-   missing data
-   limited history
-   project coverage
-   report-format changes
-   prediction uncertainty
-   model drift
-   possible data-quality issues

------------------------------------------------------------------------

# 29. FINAL MODEL HANDOFF TO OTHER TEAM MEMBERS

Give the backend/application team:

``` text
1. model files
2. preprocessing files
3. feature list
4. prediction functions
5. risk thresholds
6. SHAP explanation function
7. sample input
8. sample output
9. model version
10. metrics
11. model limitations
```

Example prediction output:

``` json
{
  "project_id": "PROJECT_ID",
  "delay_probability": 0.82,
  "cost_overrun_probability": 0.61,
  "risk_level": "HIGH",
  "top_risk_drivers": [
    {
      "feature": "progress_gap",
      "value": 0.24,
      "shap_value": 0.31,
      "direction": "increases_risk"
    }
  ],
  "model_version": "sih26103-v1"
}
```

**Important:** The numbers above are only an output format example. They
are NOT actual project predictions.

------------------------------------------------------------------------

# 30. EXPERIMENT LOG

Every experiment must record:

``` text
experiment_id
date
dataset_version
feature_version
target_version
model
hyperparameters
random_seed
train_period
validation_period
test_period
metrics
notes
```

Example:

``` text
EXP-001
Dataset: paimana-v1
Model: XGBoost
Target: future_delay
Features: feature-v1
Train: YYYY-MM-DD → YYYY-MM-DD
Validation: YYYY-MM-DD → YYYY-MM-DD
Test: YYYY-MM-DD → YYYY-MM-DD
```

------------------------------------------------------------------------

# 31. DATASET VERSIONING

Use versions:

``` text
paimana-v1
paimana-v2
paimana-v3
```

Feature versions:

``` text
features-v1
features-v2
```

Model versions:

``` text
delay-v1
delay-v2

cost-v1
cost-v2

llm-v1
llm-v2
```

Never silently replace an old model.

------------------------------------------------------------------------

# 32. WHAT THE AI/ML TEAM MUST BE ABLE TO EXPLAIN TO THE SIH JURY

## Q1. Why XGBoost?

Answer:

> XGBoost is suitable for structured tabular project-monitoring data and
> can model nonlinear relationships between project progress,
> expenditure, schedule and other project indicators. It also integrates
> well with SHAP for explainability.

## Q2. Why not use an LLM to predict project delay?

Answer:

> Numerical project-risk prediction is handled by the structured ML
> model. The LLM is used for natural-language project intelligence and
> explanation. This separation improves reliability and explainability.

## Q3. Why SHAP?

Answer:

> SHAP explains how individual features contributed to a model
> prediction, allowing monitoring officers to understand the major
> factors associated with project risk.

## Q4. How did you prevent data leakage?

Answer:

> We used time-aware prediction. Features are restricted to information
> available at the prediction time, while targets represent future
> outcomes. Model tuning is performed without using the final test set.

## Q5. Why use 2023--2026 data?

Answer:

> The historical reports provide multiple project-monitoring
> observations over time, allowing us to construct longitudinal project
> histories and learn patterns associated with future project outcomes.

## Q6. Why fine-tune an LLM?

Answer:

> Fine-tuning is optional. We evaluate whether it improves
> domain-specific response behavior. The predictive model remains the
> primary risk engine, while the LLM communicates verified information.

## Q7. Why Hugging Face?

Answer:

> Hugging Face provides access to open-weight instruction models and the
> Transformers/PEFT ecosystem needed to experiment with
> parameter-efficient fine-tuning such as LoRA and QLoRA.

------------------------------------------------------------------------

# 33. CRITICAL ARCHITECTURAL PRINCIPLE

Do NOT present the system as:

``` text
PDF
 ↓
LLM
 ↓
Risk Prediction
```

Present it as:

``` text
Official PAIMANA Data
        ↓
Longitudinal Dataset
        ↓
Feature Engineering
        ↓
XGBoost
   ↙         ↘
Delay       Cost
Risk        Risk
   ↘         ↙
      SHAP
        ↓
  Risk Engine
        ↓
Verified Project Context
        ↓
     LLM Assistant
        ↓
Natural Language Explanation
```

This distinction is extremely important.

------------------------------------------------------------------------

# 34. COMPLETE MODEL-TRAINING CHECKLIST

## Data

-   [ ] PAIMANA 2023 data processed
-   [ ] PAIMANA 2024 data processed
-   [ ] PAIMANA 2025 data processed
-   [ ] PAIMANA 2026 data processed
-   [ ] raw data preserved
-   [ ] extraction validated
-   [ ] data dictionary created
-   [ ] duplicate analysis completed
-   [ ] missing-data analysis completed
-   [ ] project IDs validated
-   [ ] longitudinal history created

## Targets

-   [ ] delay target defined
-   [ ] cost target defined
-   [ ] prediction horizon defined
-   [ ] target leakage checked
-   [ ] target distribution analyzed

## Features

-   [ ] feature dictionary
-   [ ] feature formulas
-   [ ] missing-value strategy
-   [ ] outlier analysis
-   [ ] temporal leakage check
-   [ ] target leakage check

## Evaluation

-   [ ] temporal split
-   [ ] baseline model
-   [ ] validation set
-   [ ] untouched test set
-   [ ] class imbalance analysis
-   [ ] precision
-   [ ] recall
-   [ ] F1
-   [ ] ROC-AUC
-   [ ] PR-AUC
-   [ ] confusion matrix
-   [ ] calibration where appropriate

## XGBoost

-   [ ] delay model
-   [ ] cost model
-   [ ] hyperparameter tuning
-   [ ] overfitting check
-   [ ] model export
-   [ ] model reload test

## SHAP

-   [ ] global explanation
-   [ ] local explanation
-   [ ] top risk drivers
-   [ ] SHAP validation

## Risk

-   [ ] risk score
-   [ ] risk thresholds
-   [ ] LOW
-   [ ] MEDIUM
-   [ ] HIGH
-   [ ] CRITICAL
-   [ ] threshold validation

## LLM

-   [ ] LLM task definition
-   [ ] training dataset
-   [ ] validation dataset
-   [ ] test dataset
-   [ ] base model evaluation
-   [ ] Hugging Face model selection
-   [ ] LoRA/QLoRA
-   [ ] fine-tuning
-   [ ] base vs fine-tuned comparison
-   [ ] hallucination testing
-   [ ] grounding testing

## Final

-   [ ] final model package
-   [ ] model card
-   [ ] training report
-   [ ] ML audit
-   [ ] limitations
-   [ ] handoff package

------------------------------------------------------------------------

# 35. MASTER RULE FOR EVERY PHASE

For every phase, Claude/ChatGPT MUST respond using this structure:

``` text
PHASE:
Objective:

Inputs:

What we will do:

Code:

Where to run:

Expected output:

Validation:

Potential errors:

Checkpoint:

Status:
```

After giving the code:

**WAIT FOR THE ACTUAL GOOGLE COLAB OUTPUT.**

Do not assume the code worked.

If an error occurs:

1.  identify the exact error
2.  explain the root cause
3.  provide the smallest correction
4.  explain how to verify it
5.  wait for the result

Do not rewrite the entire project unnecessarily.

------------------------------------------------------------------------

# 36. FIRST MESSAGE AFTER UPLOADING THIS FILE

After uploading:

`SIH26103_MODEL_TRAINING_MASTER_WORKFLOW.md`

and the PAIMANA files to Claude/ChatGPT Project, send:

``` text
Read SIH26103_MODEL_TRAINING_MASTER_WORKFLOW.md completely.

This file is the master instruction for my AI/ML responsibility in SIH26103.

My responsibility is ONLY model training and explainability.

The project uses official PAIMANA 2023–2026 data.

I will use Google Colab.

The core predictive models are XGBoost.

SHAP will be used for explainability.

The LLM is supplementary and will be evaluated separately.

Hugging Face LoRA/QLoRA fine-tuning is optional and must happen only after the structured ML pipeline is validated.

Do not fabricate data, metrics, project history, or results.

Do not skip validation.

Do not jump directly to fine-tuning.

Work one phase at a time.

For every phase:
1. explain the objective
2. provide exact Colab code
3. tell me where to run it
4. tell me expected output
5. give validation checks
6. wait for my actual output before continuing

First, inspect the available PAIMANA files and confirm the project plan.

Then start ONLY Phase 0.
```

------------------------------------------------------------------------

# 37. FINAL AI/ML DELIVERABLE

At the end of this workflow, the AI/ML team should have:

``` text
PAIMANA DATA
      ↓
Validated longitudinal dataset
      ↓
Future targets
      ↓
Leakage-safe features
      ↓
Temporal evaluation
      ↓
XGBoost Delay Model
      ↓
XGBoost Cost Model
      ↓
SHAP Explainability
      ↓
Deterministic Risk Engine
      ↓
Optional LLM Fine-Tuning
      ↓
Base vs Fine-Tuned Evaluation
      ↓
Final Model Package
```

**Do not optimize for "having a fine-tuned model."**

Optimize for:

``` text
Reliable prediction
+
No data leakage
+
Strong evaluation
+
Explainability
+
Grounded AI
+
Reproducibility
```

------------------------------------------------------------------------

# END

## Start at Phase 0.

Do not skip phases. Do not fabricate results. Do not use the test set
for tuning. Do not treat the LLM as the primary numerical risk
predictor.
