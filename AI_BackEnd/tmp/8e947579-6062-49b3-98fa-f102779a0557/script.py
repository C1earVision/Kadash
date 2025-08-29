import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Data: top 3 selling products and units sold
# Retrieved from database query
data = [
    ('AMD Ryzen 5 5600X', 10),
    ('Gigabyte B650E Aorus Master', 4),
    ('NVIDIA GeForce RTX 3070', 2)
]

# Create DataFrame
df = pd.DataFrame(data, columns=['Product', 'Units Sold'])

# Plotting
plt.figure(figsize=(8, 6))
sns.barplot(x='Product', y='Units Sold', data=df, palette='viridis')
plt.title('Top 3 Selling Products')
plt.ylabel('Units Sold')
plt.xlabel('Product')
plt.tight_layout()

# Save figure
plt.savefig(r'output.png')
plt.close()
