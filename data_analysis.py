import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set(style="whitegrid")

from google.colab import files
uploaded = files.upload()

df = pd.read_csv('netflix_titles.csv')
df.head()
print("Shape:", df.shape)
df.info()
df.describe(include='all')
# data cleaning
df.isnull().sum()

df['director'] = df['director'].fillna('Unknown')
df['cast'] = df['cast'].fillna('Not Available')
df['country'] = df['country'].fillna('Unknown')

df = df.dropna(subset=['date_added', 'rating'])
df = df.drop_duplicates()
# data processing
df['date_added'] = pd.to_datetime(df['date_added'], errors='coerce')

df['year_added'] = df['date_added'].dt.year
df['month_added'] = df['date_added'].dt.month


df['duration'] = df['duration'].astype(str)
sns.countplot(x='type', data=df)
plt.title("Movies vs TV Shows")
plt.show()

df['year_added'].value_counts().sort_index().plot(kind='line')
plt.title("Content Added Over Years")
plt.show()
df['country'].value_counts().head(10).plot(kind='bar')
plt.title("Top Countries")
plt.show()
sns.countplot(y='rating', data=df, order=df['rating'].value_counts().index)
plt.title("Ratings Distribution")
plt.show()

df['listed_in'].value_counts().head(10).plot(kind='bar')
plt.title("Top Genres")
plt.show()
sns.countplot(x='year_added', hue='type', data=df)
plt.xticks(rotation=90)
plt.title("Movies vs TV Shows by Year")
plt.show()
sns.countplot(x='month_added', data=df)
plt.title("Monthly Content Addition")
plt.show()
sns.histplot(df['release_year'], bins=30)
plt.title("Release Year Distribution")
plt.show()
df['director'].value_counts().head(10).plot(kind='bar')
plt.title("Top Directors")
plt.show()
sns.heatmap(df.corr(numeric_only=True), annot=True)
plt.title("Correlation Heatmap")
plt.show()
df.to_csv('netflix_cleaned.csv', index=False)