namespace NomNom.Api.Contracts;

public sealed record AddReviewRequest(string? OrderId, string? FoodItemId, int? Rating, string? Comment);
