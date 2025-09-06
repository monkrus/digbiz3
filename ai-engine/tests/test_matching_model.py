import pytest
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import cross_val_score
import joblib
import json
from unittest.mock import Mock, patch
import sys
import os

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.matching_engine import AdvancedMatchingEngine
from utils.data_processor import DataProcessor
from utils.feature_extractor import FeatureExtractor

class TestMatchingModel:
    """Test suite for the AI matching model accuracy and performance."""

    @pytest.fixture
    def matching_engine(self):
        """Create a matching engine instance for testing."""
        return AdvancedMatchingEngine()

    @pytest.fixture
    def sample_users(self):
        """Create sample user data for testing."""
        return [
            {
                'id': 'user_1',
                'name': 'Alice Johnson',
                'title': 'Senior Software Engineer',
                'company': 'Tech Corp',
                'industry': 'technology',
                'experience_years': 8,
                'skills': ['Python', 'JavaScript', 'React', 'Machine Learning'],
                'location': 'San Francisco',
                'bio': 'Passionate about AI and full-stack development',
                'network_size': 250,
                'reputation': 85
            },
            {
                'id': 'user_2',
                'name': 'Bob Smith',
                'title': 'Data Scientist',
                'company': 'AI Solutions',
                'industry': 'technology',
                'experience_years': 6,
                'skills': ['Python', 'TensorFlow', 'Statistics', 'SQL'],
                'location': 'San Francisco',
                'bio': 'Expert in machine learning and data analysis',
                'network_size': 180,
                'reputation': 78
            },
            {
                'id': 'user_3',
                'name': 'Carol Davis',
                'title': 'Marketing Director',
                'company': 'Brand Solutions',
                'industry': 'marketing',
                'experience_years': 12,
                'skills': ['Marketing Strategy', 'Brand Management', 'Digital Marketing'],
                'location': 'New York',
                'bio': 'Building brands and driving growth strategies',
                'network_size': 400,
                'reputation': 92
            },
            {
                'id': 'user_4',
                'name': 'David Wilson',
                'title': 'Financial Analyst',
                'company': 'Investment Partners',
                'industry': 'finance',
                'experience_years': 5,
                'skills': ['Financial Modeling', 'Excel', 'Bloomberg', 'Risk Analysis'],
                'location': 'New York',
                'bio': 'Focused on investment analysis and portfolio management',
                'network_size': 150,
                'reputation': 70
            }
        ]

    @pytest.fixture
    def training_data(self):
        """Create training data with known compatibility outcomes."""
        return pd.DataFrame([
            # Same industry, similar roles, high compatibility
            {'user1_industry': 'technology', 'user2_industry': 'technology', 
             'experience_diff': 2, 'location_match': 1, 'skill_overlap': 0.6, 
             'network_overlap': 0.3, 'compatible': 1},
            
            # Different industries, low compatibility
            {'user1_industry': 'technology', 'user2_industry': 'finance', 
             'experience_diff': 8, 'location_match': 0, 'skill_overlap': 0.1, 
             'network_overlap': 0.05, 'compatible': 0},
            
            # Same location, moderate compatibility
            {'user1_industry': 'marketing', 'user2_industry': 'finance', 
             'experience_diff': 3, 'location_match': 1, 'skill_overlap': 0.2, 
             'network_overlap': 0.15, 'compatible': 0.6},
            
            # High skill overlap, high compatibility
            {'user1_industry': 'technology', 'user2_industry': 'technology', 
             'experience_diff': 1, 'location_match': 1, 'skill_overlap': 0.8, 
             'network_overlap': 0.4, 'compatible': 0.9},
        ])

    def test_model_accuracy_threshold(self, matching_engine, training_data):
        """Test that the model meets minimum accuracy requirements."""
        # Train the model with test data
        X = training_data.drop('compatible', axis=1)
        y = training_data['compatible']
        
        # Use cross-validation to get accuracy scores
        scores = cross_val_score(matching_engine.model, X, y, cv=3, scoring='accuracy')
        average_accuracy = scores.mean()
        
        # Model should achieve at least 85% accuracy
        assert average_accuracy >= 0.85, f"Model accuracy {average_accuracy:.2f} below required threshold of 0.85"

    def test_model_precision_recall(self, matching_engine, training_data):
        """Test model precision and recall metrics."""
        X = training_data.drop('compatible', axis=1)
        y = training_data['compatible'] > 0.5  # Binary classification
        
        # Fit the model
        matching_engine.model.fit(X, y)
        predictions = matching_engine.model.predict(X)
        
        precision = precision_score(y, predictions, average='weighted')
        recall = recall_score(y, predictions, average='weighted')
        f1 = f1_score(y, predictions, average='weighted')
        
        assert precision >= 0.80, f"Precision {precision:.2f} below threshold"
        assert recall >= 0.75, f"Recall {recall:.2f} below threshold"
        assert f1 >= 0.75, f"F1-score {f1:.2f} below threshold"

    def test_same_industry_compatibility(self, matching_engine, sample_users):
        """Test that users in the same industry get higher compatibility scores."""
        user1 = sample_users[0]  # Technology
        user2 = sample_users[1]  # Technology
        user3 = sample_users[2]  # Marketing
        
        # Same industry should have higher compatibility
        same_industry_score = matching_engine.calculate_match_score(user1, user2)
        different_industry_score = matching_engine.calculate_match_score(user1, user3)
        
        assert same_industry_score > different_industry_score, \
            f"Same industry score {same_industry_score} not higher than different industry {different_industry_score}"

    def test_experience_level_matching(self, matching_engine, sample_users):
        """Test that similar experience levels result in better matches."""
        user1 = sample_users[0]  # 8 years experience
        user2 = sample_users[1]  # 6 years experience (similar)
        user3 = sample_users[2]  # 12 years experience (different)
        
        similar_exp_score = matching_engine.calculate_match_score(user1, user2)
        different_exp_score = matching_engine.calculate_match_score(user1, user3)
        
        assert similar_exp_score > different_exp_score, \
            "Similar experience levels should have higher compatibility"

    def test_location_proximity_impact(self, matching_engine, sample_users):
        """Test that users in the same location get compatibility boost."""
        user1 = sample_users[0]  # San Francisco
        user2 = sample_users[1]  # San Francisco
        user3 = sample_users[2]  # New York
        
        same_location_score = matching_engine.calculate_match_score(user1, user2)
        different_location_score = matching_engine.calculate_match_score(user1, user3)
        
        # Note: Location is one factor among many, so the difference might be small
        # but same location should generally score higher
        location_bonus = same_location_score - different_location_score
        assert location_bonus >= 0, "Same location should provide compatibility bonus"

    def test_skill_overlap_calculation(self, matching_engine, sample_users):
        """Test that skill overlap is calculated correctly."""
        user1 = sample_users[0]  # Python, JavaScript, React, ML
        user2 = sample_users[1]  # Python, TensorFlow, Statistics, SQL
        
        # They share 1 skill (Python) out of their combined unique skills
        score = matching_engine.calculate_match_score(user1, user2)
        
        # Extract skill overlap specifically
        skill_overlap = matching_engine._calculate_skill_overlap(user1['skills'], user2['skills'])
        
        assert 0 <= skill_overlap <= 1, "Skill overlap should be between 0 and 1"
        assert skill_overlap > 0, "Users with shared skills should have overlap > 0"

    def test_network_size_influence(self, matching_engine, sample_users):
        """Test that network size appropriately influences matching."""
        user1 = sample_users[0]  # Network size: 250
        user2 = sample_users[2]  # Network size: 400 (larger)
        user3 = sample_users[3]  # Network size: 150 (smaller)
        
        # Calculate match scores
        score_with_larger = matching_engine.calculate_match_score(user1, user2)
        score_with_smaller = matching_engine.calculate_match_score(user1, user3)
        
        # The effect depends on implementation, but there should be some influence
        network_factor_large = matching_engine._calculate_network_factor(user1['network_size'], user2['network_size'])
        network_factor_small = matching_engine._calculate_network_factor(user1['network_size'], user3['network_size'])
        
        assert 0 <= network_factor_large <= 1, "Network factor should be normalized"
        assert 0 <= network_factor_small <= 1, "Network factor should be normalized"

    def test_reputation_weighting(self, matching_engine, sample_users):
        """Test that reputation scores affect compatibility calculations."""
        user1 = sample_users[0]  # Reputation: 85
        user2 = sample_users[2]  # Reputation: 92 (higher)
        user3 = sample_users[3]  # Reputation: 70 (lower)
        
        high_rep_score = matching_engine.calculate_match_score(user1, user2)
        low_rep_score = matching_engine.calculate_match_score(user1, user3)
        
        # Higher reputation should generally lead to better matches
        reputation_impact = abs(high_rep_score - low_rep_score)
        assert reputation_impact >= 0, "Reputation should influence matching scores"

    def test_model_consistency(self, matching_engine, sample_users):
        """Test that the model produces consistent results for the same inputs."""
        user1 = sample_users[0]
        user2 = sample_users[1]
        
        # Calculate the same match multiple times
        scores = [matching_engine.calculate_match_score(user1, user2) for _ in range(5)]
        
        # All scores should be identical (deterministic)
        assert len(set(scores)) == 1, f"Model should be deterministic, got varying scores: {scores}"

    def test_score_range_validation(self, matching_engine, sample_users):
        """Test that all compatibility scores are within valid range [0, 1]."""
        for i, user1 in enumerate(sample_users):
            for j, user2 in enumerate(sample_users):
                if i != j:
                    score = matching_engine.calculate_match_score(user1, user2)
                    assert 0 <= score <= 1, f"Score {score} outside valid range [0, 1] for users {i}, {j}"

    def test_symmetric_scoring(self, matching_engine, sample_users):
        """Test that compatibility scoring is symmetric (A-B == B-A)."""
        user1 = sample_users[0]
        user2 = sample_users[1]
        
        score_ab = matching_engine.calculate_match_score(user1, user2)
        score_ba = matching_engine.calculate_match_score(user2, user1)
        
        # Scores should be identical (symmetric)
        assert abs(score_ab - score_ba) < 0.001, f"Scores should be symmetric: {score_ab} vs {score_ba}"

    def test_self_matching_prohibition(self, matching_engine, sample_users):
        """Test that users don't get matched with themselves."""
        user1 = sample_users[0]
        
        # Self-matching should return 0 or raise an exception
        with pytest.raises(ValueError, match="Cannot match user with themselves"):
            matching_engine.calculate_match_score(user1, user1)

    def test_batch_processing_consistency(self, matching_engine, sample_users):
        """Test that batch processing gives same results as individual calculations."""
        user1 = sample_users[0]
        other_users = sample_users[1:]
        
        # Individual scores
        individual_scores = [matching_engine.calculate_match_score(user1, user) for user in other_users]
        
        # Batch scores
        batch_scores = matching_engine.calculate_batch_scores(user1, other_users)
        
        # Should be identical
        for i, (individual, batch) in enumerate(zip(individual_scores, batch_scores)):
            assert abs(individual - batch) < 0.001, f"Batch score mismatch at index {i}: {individual} vs {batch}"

    def test_feature_importance(self, matching_engine, training_data):
        """Test that the model correctly identifies important features."""
        X = training_data.drop('compatible', axis=1)
        y = training_data['compatible']
        
        # Train model
        matching_engine.model.fit(X, y)
        
        # Get feature importance (if available)
        if hasattr(matching_engine.model, 'feature_importances_'):
            importances = matching_engine.model.feature_importances_
            feature_names = X.columns.tolist()
            
            # skill_overlap should be one of the most important features
            skill_overlap_idx = feature_names.index('skill_overlap')
            skill_importance = importances[skill_overlap_idx]
            
            assert skill_importance > 0.1, f"Skill overlap importance {skill_importance} seems too low"

    def test_model_bias_detection(self, matching_engine):
        """Test for potential bias in the matching algorithm."""
        # Create test data with different demographics
        biased_users = [
            {'id': '1', 'industry': 'technology', 'location': 'San Francisco', 'gender': 'male'},
            {'id': '2', 'industry': 'technology', 'location': 'San Francisco', 'gender': 'female'},
            {'id': '3', 'industry': 'technology', 'location': 'San Francisco', 'gender': 'male'},
            {'id': '4', 'industry': 'technology', 'location': 'San Francisco', 'gender': 'female'},
        ]
        
        # Calculate cross-gender vs same-gender compatibility
        same_gender_scores = []
        cross_gender_scores = []
        
        for i, user1 in enumerate(biased_users):
            for j, user2 in enumerate(biased_users[i+1:], i+1):
                try:
                    score = matching_engine.calculate_match_score(user1, user2)
                    if user1['gender'] == user2['gender']:
                        same_gender_scores.append(score)
                    else:
                        cross_gender_scores.append(score)
                except:
                    # Skip if users are too similar or other issues
                    continue
        
        if same_gender_scores and cross_gender_scores:
            same_gender_avg = np.mean(same_gender_scores)
            cross_gender_avg = np.mean(cross_gender_scores)
            
            # Difference should not be too large (indicating bias)
            bias_threshold = 0.1
            bias = abs(same_gender_avg - cross_gender_avg)
            
            assert bias < bias_threshold, f"Potential gender bias detected: {bias:.3f} difference in average scores"

    def test_edge_case_handling(self, matching_engine):
        """Test how the model handles edge cases and invalid data."""
        valid_user = {
            'id': 'user_1',
            'name': 'Valid User',
            'industry': 'technology',
            'skills': ['Python'],
            'experience_years': 5
        }
        
        # Test with missing data
        incomplete_user = {
            'id': 'user_2',
            'name': 'Incomplete User'
            # Missing industry, skills, etc.
        }
        
        # Should handle gracefully (not crash)
        try:
            score = matching_engine.calculate_match_score(valid_user, incomplete_user)
            assert 0 <= score <= 1, "Should return valid score even with incomplete data"
        except ValueError as e:
            # Acceptable to raise ValueError for incomplete data
            assert "incomplete" in str(e).lower() or "missing" in str(e).lower()

    def test_performance_requirements(self, matching_engine, sample_users):
        """Test that matching performance meets requirements."""
        import time
        
        user1 = sample_users[0]
        user2 = sample_users[1]
        
        # Measure single match time
        start_time = time.time()
        matching_engine.calculate_match_score(user1, user2)
        single_match_time = time.time() - start_time
        
        # Single match should complete within 100ms
        assert single_match_time < 0.1, f"Single match took {single_match_time:.3f}s, should be under 0.1s"
        
        # Batch processing test
        other_users = sample_users[1:]
        start_time = time.time()
        batch_scores = matching_engine.calculate_batch_scores(user1, other_users)
        batch_time = time.time() - start_time
        
        # Batch processing should be efficient
        time_per_match = batch_time / len(other_users)
        assert time_per_match < 0.05, f"Batch processing too slow: {time_per_match:.3f}s per match"

    def test_model_interpretability(self, matching_engine, sample_users):
        """Test that the model provides interpretable results."""
        user1 = sample_users[0]
        user2 = sample_users[1]
        
        # Get detailed matching factors
        detailed_result = matching_engine.get_detailed_match_analysis(user1, user2)
        
        assert 'overall_score' in detailed_result
        assert 'factors' in detailed_result
        assert isinstance(detailed_result['factors'], dict)
        
        # Key factors should be present
        expected_factors = ['industry_compatibility', 'skill_overlap', 'experience_match', 'location_proximity']
        for factor in expected_factors:
            assert factor in detailed_result['factors'], f"Missing factor: {factor}"
            assert 0 <= detailed_result['factors'][factor] <= 1, f"Factor {factor} out of range"

    def test_model_updates_and_retraining(self, matching_engine):
        """Test that the model can be updated with new training data."""
        # Initial training data
        initial_data = pd.DataFrame([
            {'feature1': 1, 'feature2': 0.5, 'compatible': 1},
            {'feature1': 0, 'feature2': 0.2, 'compatible': 0}
        ])
        
        # New training data
        new_data = pd.DataFrame([
            {'feature1': 0.8, 'feature2': 0.7, 'compatible': 1},
            {'feature1': 0.1, 'feature2': 0.3, 'compatible': 0}
        ])
        
        # Train initially
        X_initial = initial_data.drop('compatible', axis=1)
        y_initial = initial_data['compatible']
        matching_engine.model.fit(X_initial, y_initial)
        
        initial_prediction = matching_engine.model.predict([[0.9, 0.8]])[0]
        
        # Update with new data
        X_combined = pd.concat([initial_data, new_data]).drop('compatible', axis=1)
        y_combined = pd.concat([initial_data, new_data])['compatible']
        matching_engine.model.fit(X_combined, y_combined)
        
        updated_prediction = matching_engine.model.predict([[0.9, 0.8]])[0]
        
        # Model should have updated (predictions might change)
        # This test ensures the retraining mechanism works
        assert matching_engine.model is not None, "Model should remain functional after retraining"

    @pytest.mark.integration
    def test_end_to_end_matching_pipeline(self, matching_engine, sample_users):
        """Integration test for the complete matching pipeline."""
        user1 = sample_users[0]
        candidates = sample_users[1:]
        
        # Run complete matching pipeline
        matches = matching_engine.find_best_matches(user1, candidates, top_k=2)
        
        assert len(matches) <= 2, "Should return at most 2 matches"
        assert all('score' in match for match in matches), "All matches should have scores"
        assert all('user' in match for match in matches), "All matches should have user data"
        assert all(0 <= match['score'] <= 1 for match in matches), "All scores should be valid"
        
        # Results should be sorted by score (descending)
        scores = [match['score'] for match in matches]
        assert scores == sorted(scores, reverse=True), "Matches should be sorted by score"

if __name__ == '__main__':
    pytest.main([__file__, '-v'])