import pandas as pd
import matplotlib.pyplot as plt

# Data
data = {
    'Product': ['AMD Ryzen 5 5600X', 'Gigabyte B650E Aorus Master', 'NVIDIA GeForce RTX 3070'],
    'UnitsSold': [10, 4, 2]
}

df = pd.DataFrame(data)

plt.figure(figsize=(8,6))
plt.bar(df['Product'], df['UnitsSold'], color='skyblue')
plt.title('Top 3 Selling Products by Units Sold')
plt.xlabel('Product')
plt.ylabel('Units Sold')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()

# Save figure
output_path = r"output.png"
plt.savefig(output_path)
plt.close()

print("Saved to", output_path)
