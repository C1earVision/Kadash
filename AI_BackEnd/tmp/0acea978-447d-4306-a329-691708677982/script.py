import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Data from the SQL query
products = ['AMD Ryzen 5 5600X', 'Gigabyte B650E Aorus Master', 'NVIDIA GeForce RTX 3070']
units_sold = [10, 4, 2]

# Create DataFrame
df = pd.DataFrame({
    'Product': products,
    'Units_Sold': units_sold
})

# Create bar chart
plt.figure(figsize=(10, 6))
sns.set_style("whitegrid")

# Create the bar plot
bars = plt.bar(df['Product'], df['Units_Sold'], color=['#FF6B6B', '#4ECDC4', '#45B7D1'])

# Customize the plot
plt.title('Top 3 Best Selling Products by Units Sold', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Product Name', fontsize=12)
plt.ylabel('Total Units Sold', fontsize=12)
plt.xticks(rotation=15, ha='right')

# Add value labels on top of each bar
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
             f'{int(height)}', ha='center', va='bottom', fontweight='bold')

# Add grid for better readability
plt.grid(axis='y', alpha=0.3)

# Adjust layout to prevent label cutoff
plt.tight_layout()

# Save the plot
plt.savefig('output.png', dpi=300, bbox_inches='tight')
plt.close()

print("Bar chart created successfully")