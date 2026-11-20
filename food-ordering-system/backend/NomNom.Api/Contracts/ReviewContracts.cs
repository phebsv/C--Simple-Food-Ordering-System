namespace NomNom.Api.Contracts;

internal sealed record AddReviewRequest(string? OrderId, string? FoodItemId, int? Rating, string? Comment);
