import pandas as pd

df = pd.read_csv("../data_collection/dataset/master_dataset.csv")

print("Confidence Distribution:")
print(df["confidence_label"].value_counts())

print("\nClarity Distribution:")
print(df["clarity_label"].value_counts())