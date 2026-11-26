using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;
using NomNom.Api.Repositories;
using NomNom.Api.Services;

var connectionString = Environment.GetEnvironmentVariable("NOMNOM_TEST_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("Set NOMNOM_TEST_CONNECTION_STRING to run the MySQL integration check.");
    return 2;
}

var connectionSettings = new MySqlConnectionStringBuilder(connectionString);
if (connectionSettings.Database != "nomnom_test" &&
    !(connectionSettings.Database == "nomnom" &&
      Environment.GetEnvironmentVariable("NOMNOM_TEST_ALLOW_NOMNOM") == "1"))
{
    Console.Error.WriteLine(
        "Use the dedicated nomnom_test database. To explicitly use nomnom, set NOMNOM_TEST_ALLOW_NOMNOM=1.");
    return 2;
}

await using var dataSource = new MySqlDataSourceBuilder(connectionString).Build();
var accountRepository = new MySqlAccountRepository(dataSource);
var cartRepository = new MySqlCartRepository(dataSource);
var menuRepository = new MySqlMenuRepository(dataSource);
var orderRepository = new MySqlOrderRepository(dataSource, TimeProvider.System);
var reviewRepository = new MySqlReviewRepository(dataSource);

var suffix = Guid.NewGuid().ToString("N");
var userId = $"it-user-{suffix}";
var menuIdOne = $"it-menu-a-{suffix}";
var menuIdTwo = $"it-menu-b-{suffix}";
var email = $"integration-{suffix}@example.test";
string? orderId = null;
var fixturesSeeded = false;

try
{
    await VerifyMigrationAsync(dataSource);
    await SeedAsync(dataSource, userId, email, menuIdOne, menuIdTwo);
    fixturesSeeded = true;

    var expectedCart = new Dictionary<string, int>(StringComparer.Ordinal)
    {
        [menuIdOne] = 2,
        [menuIdTwo] = 3
    };
    var order = await orderRepository.PlaceAsync(
        userId,
        new CheckoutDetails(
            "Integration Customer",
            "09171234567",
            "100 Test Street, Test City",
            "cash",
            null),
        expectedCart,
        CancellationToken.None);
    orderId = order.Id;

    AssertEqual(56.40m, order.Subtotal, "order subtotal");
    AssertEqual(56.40m, order.Total, "order total");
    AssertEqual(2, order.Items.Count, "order item count");
    AssertLine(order.Items, menuIdOne, "Integration Burger", 14.25m, 2);
    AssertLine(order.Items, menuIdTwo, "Integration Drink", 9.30m, 3);

    var persistedOrder = await orderRepository.FindAsync(order.Id, userId, CancellationToken.None)
        ?? throw new InvalidOperationException("The placed order could not be read back.");
    AssertEqual(56.40m, persistedOrder.Total, "persisted order total");
    AssertEqual(56.40m, persistedOrder.Items.Sum(item => item.Price * item.Quantity),
        "persisted line-item sum");
    Console.WriteLine("PASS: real MySQL checkout used live menu prices (not stale cart prices): 2 x 14.25 + 3 x 9.30 = 56.40.");

    var review = new Review
    {
        Id = $"it-review-{suffix}",
        OrderId = order.Id,
        CustomerId = userId,
        CustomerName = "Integration Customer",
        FoodItemId = menuIdOne,
        FoodItemName = "Integration Burger",
        Rating = 5,
        Comment = "integration test",
        CreatedAt = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture),
        Hidden = false
    };
    if (!await reviewRepository.TryInsertAsync(review, DateTime.UtcNow, CancellationToken.None))
        throw new InvalidOperationException("Could not insert integration review.");
    if (!await reviewRepository.DeleteAsync(review.Id, CancellationToken.None))
        throw new InvalidOperationException("Review soft-delete failed.");
    if ((await reviewRepository.ListAsync(CancellationToken.None)).Any(item => item.Id == review.Id))
        throw new InvalidOperationException("Archived review appeared in the active review list.");
    if (!(await reviewRepository.ListDeletedAsync(CancellationToken.None)).Any(item => item.Id == review.Id))
        throw new InvalidOperationException("Archived review is missing from deleted review list.");
    if (!await reviewRepository.RestoreAsync(review.Id, CancellationToken.None))
        throw new InvalidOperationException("Review restore failed.");

    if (!await orderRepository.SoftDeleteAsync(order.Id, CancellationToken.None))
        throw new InvalidOperationException("Order soft-delete failed.");
    if (await orderRepository.FindAsync(order.Id, userId, CancellationToken.None) is not null)
        throw new InvalidOperationException("Archived order appeared in active order lookup.");
    if (!(await orderRepository.ListDeletedAsync(CancellationToken.None)).Any(item => item.Id == order.Id))
        throw new InvalidOperationException("Archived order is missing from deleted order list.");
    if (!await orderRepository.RestoreAsync(order.Id, CancellationToken.None))
        throw new InvalidOperationException("Order restore failed.");

    var restoredCartLine = await cartRepository.TryInsertOrRestoreAsync(new CartItem
    {
        Id = $"it-new-cart-{suffix}",
        CustomerId = userId,
        MenuId = menuIdOne,
        Name = "Integration Burger",
        Description = "Integration test fixture",
        Price = 14.25m,
        Category = "Integration",
        Image = "",
        Quantity = 1
    }, CancellationToken.None) ?? throw new InvalidOperationException("Cart line restore failed.");
    AssertEqual(1, restoredCartLine.Quantity, "restored cart quantity");

    if (!await menuRepository.DeleteAsync(menuIdOne, CancellationToken.None))
        throw new InvalidOperationException("Menu item soft-delete failed.");
    if (await menuRepository.FindAsync(menuIdOne, CancellationToken.None) is not null)
        throw new InvalidOperationException("Archived menu item appeared in active lookup.");
    if (!(await menuRepository.ListDeletedAsync(CancellationToken.None)).Any(item => item.Id == menuIdOne))
        throw new InvalidOperationException("Archived menu item is missing from deleted list.");
    if ((await cartRepository.ListAsync(userId, CancellationToken.None)).Any(item => item.MenuId == menuIdOne))
        throw new InvalidOperationException("Archiving a menu item left its cart line active.");
    if (!await menuRepository.RestoreAsync(menuIdOne, CancellationToken.None))
        throw new InvalidOperationException("Menu item restore failed.");

    if (!await accountRepository.SoftDeleteAsync(userId, CancellationToken.None))
        throw new InvalidOperationException("User soft-delete failed.");
    if (await accountRepository.FindByIdAsync(userId, CancellationToken.None) is not null)
        throw new InvalidOperationException("Archived user appeared in active lookup.");
    if (!(await accountRepository.ListDeletedAsync(CancellationToken.None)).Any(user => user.Id == userId))
        throw new InvalidOperationException("Archived user is missing from deleted user list.");
    if (!await accountRepository.RestoreAsync(userId, CancellationToken.None))
        throw new InvalidOperationException("User restore failed.");

    Console.WriteLine("PASS: menu, user, order, and review archive/restore checks passed.");
    return 0;
}
catch (Exception error)
{
    Console.Error.WriteLine($"FAIL: {error.Message}");
    return 1;
}
finally
{
    if (fixturesSeeded || orderId is not null)
        await CleanupAsync(dataSource, userId, menuIdOne, menuIdTwo, orderId);
}

static async Task VerifyMigrationAsync(MySqlDataSource dataSource)
{
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND ((table_name IN ('users', 'menu_items', 'orders') AND column_name IN ('is_deleted', 'deleted_at'))
               OR (table_name = 'menu_items' AND column_name = 'deleted_available')
               OR (table_name = 'cart_items' AND column_name = 'deleted_at')
               OR (table_name = 'reviews' AND column_name = 'deleted_at'));
        """;
    var count = Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    if (count != 9)
        throw new InvalidOperationException(
            "Soft-delete migration is missing. Apply data/003-soft-delete.sql before running this check.");
}

static async Task SeedAsync(
    MySqlDataSource dataSource, string userId, string email, string menuIdOne, string menuIdTwo)
{
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var transaction = await connection.BeginTransactionAsync();
    try
    {
        await using (var user = connection.CreateCommand())
        {
            user.Transaction = transaction;
            user.CommandText = """
                INSERT INTO users (id, email, name, role, password_hash, phone, address)
                VALUES (@id, @email, 'Integration Customer', 'user', REPEAT('x', 60), '09171234567', '');
                """;
            user.Parameters.AddWithValue("@id", userId);
            user.Parameters.AddWithValue("@email", email);
            await user.ExecuteNonQueryAsync();
        }

        await InsertMenuItemAsync(
            connection, transaction, menuIdOne, "Integration Burger", 14.25m, 10);
        await InsertMenuItemAsync(
            connection, transaction, menuIdTwo, "Integration Drink", 9.30m, 10);
        await InsertCartItemAsync(connection, transaction, userId, menuIdOne, "Integration Burger", 0.01m, 2);
        await InsertCartItemAsync(connection, transaction, userId, menuIdTwo, "Integration Drink", 0.01m, 3);
        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}

static async Task InsertMenuItemAsync(
    MySqlConnection connection, MySqlTransaction transaction, string id, string name, decimal price, int stock)
{
    await using var command = connection.CreateCommand();
    command.Transaction = transaction;
    command.CommandText = """
        INSERT INTO menu_items (id, name, description, price, category, image, available, stock, last_updated)
        VALUES (@id, @name, 'Integration test fixture', @price, 'Integration', '', TRUE, @stock, UTC_TIMESTAMP(6));
        """;
    command.Parameters.AddWithValue("@id", id);
    command.Parameters.AddWithValue("@name", name);
    command.Parameters.AddWithValue("@price", price);
    command.Parameters.AddWithValue("@stock", stock);
    await command.ExecuteNonQueryAsync();
}

static async Task InsertCartItemAsync(
    MySqlConnection connection, MySqlTransaction transaction, string userId, string menuId,
    string name, decimal price, int quantity)
{
    await using var command = connection.CreateCommand();
    command.Transaction = transaction;
    command.CommandText = """
        INSERT INTO cart_items (id, customer_id, menu_id, name, description, price, category, image, quantity)
        VALUES (@id, @customerId, @menuId, @name, 'Integration test fixture', @price, 'Integration', '', @quantity);
        """;
    command.Parameters.AddWithValue("@id", $"it-cart-{Guid.NewGuid():N}");
    command.Parameters.AddWithValue("@customerId", userId);
    command.Parameters.AddWithValue("@menuId", menuId);
    command.Parameters.AddWithValue("@name", name);
    command.Parameters.AddWithValue("@price", price);
    command.Parameters.AddWithValue("@quantity", quantity);
    await command.ExecuteNonQueryAsync();
}

static void AssertLine(
    IReadOnlyList<OrderItem> items, string id, string name, decimal price, int quantity)
{
    var item = items.SingleOrDefault(line => line.Id == id)
        ?? throw new InvalidOperationException($"Missing order item {name}.");
    AssertEqual(name, item.Name, $"{name} name");
    AssertEqual(price, item.Price, $"{name} unit price");
    AssertEqual(quantity, item.Quantity, $"{name} quantity");
}

static void AssertEqual<T>(T expected, T actual, string label)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
        throw new InvalidOperationException($"{label}: expected {expected}, got {actual}.");
}

static async Task CleanupAsync(
    MySqlDataSource dataSource, string userId, string menuIdOne, string menuIdTwo, string? orderId)
{
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var transaction = await connection.BeginTransactionAsync();
    try
    {
        await ExecuteCleanupCommandAsync(connection, transaction,
            "DELETE FROM cart_items WHERE customer_id = @userId OR menu_id IN (@menuOne, @menuTwo);",
            ("@userId", userId), ("@menuOne", menuIdOne), ("@menuTwo", menuIdTwo));
        if (orderId is not null)
        {
            await ExecuteCleanupCommandAsync(connection, transaction,
                "DELETE FROM reviews WHERE order_id = @orderId;", ("@orderId", orderId));
            await ExecuteCleanupCommandAsync(connection, transaction,
                "DELETE FROM order_items WHERE order_id = @orderId;", ("@orderId", orderId));
            await ExecuteCleanupCommandAsync(connection, transaction,
                "DELETE FROM orders WHERE id = @orderId;", ("@orderId", orderId));
        }
        await ExecuteCleanupCommandAsync(connection, transaction,
            "DELETE FROM menu_items WHERE id IN (@menuOne, @menuTwo);",
            ("@menuOne", menuIdOne), ("@menuTwo", menuIdTwo));
        await ExecuteCleanupCommandAsync(connection, transaction,
            "DELETE FROM users WHERE id = @userId;", ("@userId", userId));
        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}

static async Task ExecuteCleanupCommandAsync(
    MySqlConnection connection, MySqlTransaction transaction, string sql,
    params (string Name, string Value)[] parameters)
{
    await using var command = connection.CreateCommand();
    command.Transaction = transaction;
    command.CommandText = sql;
    foreach (var (name, value) in parameters)
        command.Parameters.AddWithValue(name, value);
    await command.ExecuteNonQueryAsync();
}
